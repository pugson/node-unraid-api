import dotenv from "dotenv";
import axios from "axios";
import http from "http";
import https from "https";
import cheerio from "cheerio";
import FormData from "form-data";

dotenv.config();

const HOST = process.env.UNRAID_HOST;
const PROTOCOL = process.env.SECURE ? "https" : "http";
const ENDPOINT = `${PROTOCOL}://${HOST}`;
let authCookie;
let authFormData = new FormData();
authFormData.append("username", process.env.UNRAID_USERNAME);
authFormData.append("password", process.env.UNRAID_PASSWORD);

axios.defaults.withCredentials = true;
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

export function getUnraidData() {
  login(`${ENDPOINT}/login`, authFormData, () => {
    getDockerContainers();
  });
}

function login(url, data, callback) {
  axios({
    method: "POST",
    url,
    data,
    headers: {
      ...data.getHeaders(),
      "cache-control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    httpAgent: new http.Agent({ keepAlive: true }),
    maxRedirects: 0,
  })
    .then(function (response) {
      authCookie = response.headers["set-cookie"][0];
      callback();
    })
    .catch(function (error) {
      // this is some crazy shit from
      // https://github.com/ElectricBrainUK/UnraidAPI/blob/master/utils/Unraid.js#L39-L60
      if (error.response && error.response.headers["set-cookie"] && error.response.headers["set-cookie"][0]) {
        authCookie = error.response.headers["set-cookie"][0];
        // console.log(authCookie, error.response.headers["set-cookie"][0]);
        callback();
      } else if (error.response && error.response.headers.location) {
        login(error.response.headers.location, data);
      }
    });
}

function getDockerContainers() {
  axios({
    method: "GET",
    url: `${ENDPOINT}/plugins/dynamix.docker.manager/include/DockerContainers.php`,
    headers: {
      Cookie: authCookie,
    },
  })
    .then(async (response) => {
      console.log("checking dockers...");

      const page = response.data;
      const $ = cheerio.load(page);

      $(".outer .appname a").each((index, container) => {
        console.log($(container).text());
      });
    })
    .catch((error) => {
      console.log("Getting Docker containers failed.");
      console.log(error.message);
    });
}
