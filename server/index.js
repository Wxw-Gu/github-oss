const express = require("express");
const multer = require("multer");
const expressStatic = require("express-static");
const fs = require("fs-extra");
const path = require("path");
const conf_info = require("../config");
const request = require("request");
const bodyParser = require("body-parser");
const cors=require("cors");

let server = express();
server.use(cors());

server.use(bodyParser.json());
let upload = multer({ dest: __dirname + "/assets/" });

// 获取配置信息
const host = "http://localhost";
const server_port = conf_info["server_port"];
const secret_token = conf_info["secret_token"];
const url = `${host}:${server_port}/upload_file`;

console.log(`host:${host}`);
console.log(`server_port:${server_port}`);
console.log(`url:${url}`);

async function mkdir(folderpath) {
  try {
    const pathArr = folderpath.split("/");
    let _path = "";
    for (let i = 0; i < pathArr.length; i++) {
      if (pathArr[i]) {
        _path += `${pathArr[i]}/`;
        console.log(fs.existsSync(_path));
        if (!fs.existsSync(_path)) {
          fs.mkdirSync(_path);
        }
      }
    }
  } catch (e) {}
}

function drawWatermark(path, option = {}) {
  const { scale = 0.3, wmPath } = option;
  var images = require("images");

  //水印图片
  var watermarkImg = wmPath ? images(wmPath) : images("watermask.png");

  //等待加水印的图片
  var sourceImg = path ? images(path) : images("home.png");

  // 比如放置在右下角，先获取原图的尺寸和水印图片尺寸
  var sWidth = sourceImg.width();
  var sHeight = sourceImg.height();
  const w = sWidth * scale;
  watermarkImg.size(w, w / 2);

  var wmWidth = watermarkImg.width();
  var wmHeight = watermarkImg.height();

  const dirPath = "./server/assets/";
  mkdir(dirPath);
  let fileName = path.split("\\").pop();
  //设置绘制的坐标位置，右下角距离 5px
  images(sourceImg)
    .draw(watermarkImg, sWidth - wmWidth - 5, sHeight - wmHeight - 5)
    //保存
    .save(`${dirPath}${fileName}`);
}

async function pushToGithub(base64, fileName) {
  let data = {
        url: conf_info.github_url + fileName,
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "PostmanRuntime/7.29.2",
          Authorization: `token ${conf_info.github_token}`,
        },
        body: JSON.stringify({
          message: "upload file",
          committer: conf_info.committer,
          content: 1,
        }),
      }
    console.log(data,'data')
  return new Promise(async (resolve, reject) => {

    await request.put(
      {
        url: conf_info.github_url + fileName,
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "PostmanRuntime/7.29.2",
          Authorization: `token ${conf_info.github_token}`,
        },
        body: JSON.stringify({
          message: "upload file",
          committer: conf_info.committer,
          content: base64,
        }),
      },
      function optionalCallback(err, httpResponse, body) {
        if (err) {
          console.log(err)
          resolve("");
        } else {
          // 如果请求正常，则返回图片地址
          resolve(JSON.parse(body));
        }
      }
    );
  });
}

//  随机产生字符串
function randomString(e) {
  e = e || 32;
  var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz012345678",
    a = t.length,
    n = "";
  for (i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
  return n;
}

// 处理提交文件的post请求
server.post("/upload_file", upload.single("file"), async function (req, res) {
  console.log("file信息", req.file);
  let new_image_name =
    String(Date.now()) +
    randomString(8) +
    "." +
    req.file.mimetype.split("/").pop();
  console.log("===req>>>::", req);
  // 如配置文件conf.js中secret_token为空字符串，或客户端携带正确的secret_token, 则进行存储； 如果无法通过校验，则返回鉴权失败
  if (
    secret_token.length === 0 ||
    req["body"]["secret_token"] === secret_token
  ) {
    const _filePath = path.join(req.file.destination, new_image_name);
    fs.moveSync(req.file.path, _filePath);
    try {
      drawWatermark(_filePath);
    } catch (error) {
      console.log(
        "%c [ error ] ==> 129 - index.js",
        "font-size:13px; background:pink; color:#bf2c9f;",
        error
      );
    }

    const fileRes = await fs.readFileSync(_filePath);
    var base64str = fileRes.toString("base64");
    const u = await pushToGithub(base64str, `images/${new_image_name}`);
    // todo 照片存在本地这里就不需要删除
    // fs.unlinkSync(_filePath);
    res.send(u?.content?.download_url);
    return;

    // let image_url = `${host}:${server_port}/assets/${new_image_name}`;
    // if (server_port == "80" || server_port == "443") {
    //   image_url = `${host}/assets/${new_image_name}`;
    // }

    // res.send(image_url);
  } else {
    res.send("鉴权失败！");
  }
});

server.get("/", function (req, res) {
  res.send("这是一个适用于Github的私有化图床！");
});

// 处理静态目录
server.use(expressStatic(__dirname));

// 监听服务
server.listen(server_port, function () {
  console.log(`图床上传接口 ${url}`);
});