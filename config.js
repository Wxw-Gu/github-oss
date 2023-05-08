module.exports = {
  // 填写服务端运行的端口号
  server_port: "12818",
  // secret_token (客户端和服务端会同时添加secret_token鉴权，防止被他人滥用)
  secret_token: "",
  /** github上申请的token */
  github_token: "",
  /** github仓库地址  https://api.github.com/repos/${账户名}/${仓库名}/contents/${文件名称以及地址}  */
  github_url: "https://api.github.com/repos/Wxw-Gu/github-oss/contents/",
  /** 提交人，提交邮箱 */
  committer: {
    name: "Wxw",
    email: "969409112@qq.com",
  },
};