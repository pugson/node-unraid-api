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
let csrf_token;
let authCookie;
let authFormData = new FormData();
authFormData.append("username", process.env.UNRAID_USERNAME);
authFormData.append("password", process.env.UNRAID_PASSWORD);

axios.defaults.withCredentials = true;
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
// axios.defaults.headers.common["X-CSRF-TOKEN"] = "B888B35689FA59A5";
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

export function getUnraidData() {
  login(`${ENDPOINT}/login`, authFormData, () => {
    getDockerContainers();
    // getToken(() => {
    // getDrives();
    // });

    getDrives();
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

function getToken(callback) {
  axios({
    method: "GET",
    url: `${ENDPOINT}/Main`,
    headers: {
      Cookie: authCookie,
    },
  }).then((response) => {
    const page = response.data;
    const token = page
      .match(/csrf_token\"\:\"*.?([A-Z])\w+/g)
      .toString()
      .replace('csrf_token":"', "");

    csrf_token = token;

    callback();
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
    .then((response) => {
      let dockers = [];
      const page = response.data;

      const $ = cheerio.load(page, {
        xmlMode: true, // needs to be here cause unraid returns invalid html...
      });

      $("tr").each((index, container) => {
        const id = $(container).find(".outer .hand").prop("id");
        const name = $(container).find(".appname a").text();
        const state = $(container).find(".outer .state").text();
        const icon = $(container).find(".hand img").prop("src");
        const updateState =
          $(container).find(".updatecolumn .advanced span").text().trim() === "force update"
            ? "up-to-date"
            : "update available";
        const ip = getDockerIP($(container).find(`td[style="white-space:nowrap"] .docker_readmore`).html());
        // const cpu = $(container).find('span[class^="cpu-"]').text();
        // cpu is not updated here
        // need to subscribe to /Docker/sub/dockerload and parse the values by id

        dockers.push({
          id,
          name,
          state,
          updateState,
          ip,
        });
      });

      console.log(dockers);
    })
    .catch((error) => {
      console.log("Getting Docker containers failed.");
      console.log(error.message);
    });
}

function getDockerLoad() {
  axios({
    method: "GET",
    url: `${ENDPOINT}/Docker/sub/dockerload`,
    headers: {
      Cookie: authCookie,
    },
  }).then((response) => {
    console.log(response.data);
  });
}

function getDockerIP(text) {
  if (text) {
    // lol i know...
    const ip = text.match(/[\d]*\.[\d]*\.[\d]*\.[\d]*\:[\d]*/gm).pop();
    return ip;
  }

  return false;
}

function getDrives() {
  axios({
    method: "GET",
    url: `${ENDPOINT}/plugins/jsonapi/api.php?file=disks.ini`,
    headers: {
      Cookie: authCookie,
    },
  })
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
      console.log("Unable to get drives from Unraid.");
      console.log(
        "You need to install this plugin: https://raw.githubusercontent.com/Cyanlabs/jsonapi-unraid/master/jsonapi.plg"
      );
    });
}
