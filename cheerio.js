const request = require('request');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

request.get('https://www.yunzhijia.com/home/?m=open&a=login', function(error, response, body) {
  if (!error && response.statusCode == 200) {
    // 输出网页内容
    console.log(body.document);
  }
})

var server = app.listen(8020, function () {
  console.log('8020 port are running now!');
});