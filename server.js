const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
axios.defaults.withCredentials=true;//让ajax携带cookie
const qs = require('qs');// 将js对象格式化为form-data形式
const conn = require('./dblink');
const fs = require('fs');
const node_xlsx = require('node-xlsx');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')))
app.get('/', function(req, res) {
    console.log(__dirname)
    res.sendFile(__dirname + '/index.html');
});

//创建application/x-wwww-form-urlencoded解析
const urlencodedParser = bodyParser.urlencoded({ extended: false });
// const TICKET = 'APPURLWITHTICKETa2d5120f4e2760637b0a6a174689a24e';
app.post('/login', urlencodedParser, function(req, res) {
  let year = req.body.year, month = parseInt(req.body.month);
  let startDate = formatDate(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  let endDate = formatDate(new Date(year, month - 0, 0), 'yyyy-MM-dd');
  let userInfo = {
    username: req.body.username,
    password: req.body.password,
    startDate: startDate,
    endDate: endDate,
    limit: 31
  };
  userLogin(userInfo, res);
});


app.post('/lazy', urlencodedParser, function(req, res) {
  let userInfo = {
    username: req.body.username,
    password: req.body.password,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    limit: 100
  };
  userLogin(userInfo, res);
});

function userLogin(userInfo, res) {
  if (!userInfo.username.trim() || !userInfo.password.trim()) return;
  // axios模拟表单请求时,参数不应该传对象，应该传的是键值对的形式
  axios.post('https://www.yunzhijia.com/space/c/rest/user/login?' + Date.now(),qs.stringify({
      email: userInfo.username,
      password: userInfo.password,
      remember: false,
      forceToNetwork: false,
      redirectUrl: '',
      accountType: ''
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      // 拿到响应中的set-cookie,set-cookie里面有辨认客户端的sessionId,云之家经过测试,后端验证字段是at
      let cookie = response.headers['set-cookie'];
      let cookieStr = cookie.join(',');
      let at = cookieStr.substring(cookieStr.indexOf('at='), cookieStr.indexOf(';'));
      getUserId(at, userInfo, res);
    }).catch(error => console.log("aa"));
}

// 拿到用户的userId
function getUserId(at, userInfo, res) {
  let userId = '', deptId = '';
  axios.get('https://www.yunzhijia.com/space/c/rest/teamaccount/showteams', {
    headers: {
      'Cookie': at + ";"
    }
  }).then(response => {
    // 拿到userId
    let data = response.data.teams[0];
    userId = data.userId;
    deptId = data.networkProfile.orgId
    getLappKey(at, userId, userInfo, res);
  }).catch(err => {
    console.log(err)
  })
}

// 查询用户信息
function queryUserInfo(at, userId, ticket, userInfo, res) {
  axios.get('https://www.yunzhijia.com/attendance/rest/web-record/clockInUsers', {
    params: {
      startDate: userInfo.startDate,
      endDate: userInfo.endDate,
      userId: userId,
      status: '',
      page: 1,
      limit: userInfo.limit,
      sort: '-day',
      lappName: 'attendance',
      ticket: ticket
    },
    headers: {
      'Cookie': at + ";",
    }
  }).then(response => {
    let registerList = response.data.data.list;
    let finalData = [], dataArray = [], dataObj = {}, dataList = [];
    finalData.push(['部门', '姓名', '工作日期', '最早签到时间', '最晚签到时间', '工作时长', '金额']);
    for (let data of registerList) {
      // 过滤数据，获取必须的几个字段
      dataObj = filterData(data);
      dataArray.push(dataObj);
    }
    // 将item为undefined的数据过滤掉
    dataList = dataArray.filter(item => item);
    for (let val of dataList) {
      // 过滤掉金额为0的数据
      if (val.money !== 0) {
        finalData.push(Object.values(val));
      }
    }
    generateExcel(finalData, userInfo, res);
    downloadFile(res, userInfo);
  }).catch(err => console.log(err));
}

function getLappKey(at, userId, userInfo, res) {
  // https://www.yunzhijia.com/space/c/rest/app/getlightappurl?appId=10243&originType=web&_=1540819727515
  axios.get('https://www.yunzhijia.com/space/c/rest/app/getlightappurl', {
    params: {
      appId: '10243',
      originType: 'web',
      '_=': Date.now()
    },
    headers: {
      'Cookie': at + ";"
    }
  }).then(response => {
    // 这里拿到的是签到统计页
    let lightAppUrl = response.data.lightAppUrl;
    let params = urlParam(lightAppUrl);
    queryUserInfo(at, userId, params.ticket, userInfo, res);
  }).catch(err => console.log(err))
}

// 截取url参数的方法
function urlParam(url) {
  let theRequest = {};
  if (url.indexOf("?") != -1) {
    var str = url.substr(url.indexOf('?') + 1);
    strs = str.split("&");
    for(var i = 0, len = strs.length; i < len; i ++) {
      param = strs[i].split("=");
      theRequest[param[0]]=decodeURIComponent(param[1]);
    }
  }
  return theRequest;
}

// 日期格式化
function formatDate (date, fmt) {
  if (!fmt || !date) return; // 参数不存在的话不执行函数
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  let o = {
    'M+': date.getMonth() + 1, // 月份,由于月份从0开始，所以要加1
    'd+': date.getDate(), // 天
    'h+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分钟
    's+': date.getSeconds() // 秒钟
  };

  let week = {
    "0": "日",
    "1": "一",
    "2": "二",
    "3": "三",
    "4": "四",
    "5": "五",
    "6": "六"
  };

  if(/(E+)/.test(fmt)){         
    fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "星期" : "周") : "")+week[date.getDay()+""]);         
  }    
  for (let k in o) {
    if (new RegExp(`(${k})`).test(fmt)) { // 注意RegExp.$1匹配的是正则表达式的第一个子串，凡是被括号包裹起来的才是子串。
      let str = o[k] + '';
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? str : ('00' + str).substr(str.length));
    }
  }
  return fmt;
}

// 格式化数据,只截取需要导出的那部分
function filterData(obj) {
  if(!obj) return;
  if(obj.workLong === 0) return;
  /**
   * department: 业务产品部
   * userName: 王卓淇
   * workLong: 工作时长(12.49)
   * startWork: 最早签到时间'07:51 深圳金蝶软件园'
   * endWork: 最晚签到时间 '07:51 深圳金蝶软件园'
   * money: 每天的补贴金额
   * 
   * 记钱规则：
   * 1. 周一到周五每天8点后签到并且到岗时长大于8个小时有15块钱
   * 2. 周末签到满2个小时15块, 满四个小时30块。
   */
  // 定义一个所需要的字段的对象
  let needFields = {
    department: obj.department,
    userName: obj.userName,
    date: formatDate(new Date(obj.day), 'yyyy-MM-dd EE'),
    startWork: obj.startWork ? obj.startWork.substr(0, 5) : obj.startWork,
    endWork: obj.endWork ? obj.endWork.substr(0, 5) : obj.endWork,
    workLong: obj.workLong,
    money: 15,
  };


  // 周末的计算规则
  if ((needFields.date.substr(needFields.date.length - 1) === '六' || needFields.date.substr(needFields.date.length - 1) === '日')) {
    if (needFields.workLong < 4) {
      needFields.money = 0;
    } else if (needFields.workLong >= 8){
      needFields.money = 30
    } else {
      needFields.money = 15;
    }
  } else { // 工作日的计算规则
    let time = needFields.endWork.substr(0, 5).split(':');
    let hour = parseInt(time[0]), minute = parseInt(time[1]);
    if (hour >= 20 && minute >= 0 && needFields.workLong > 8) {
      needFields.money = 15;
    } else {
      needFields.money = 0;
    }
  }
  
  return needFields;
}

// 生成excel文件
function generateExcel(data, userInfo, res) {
  let obj = [
    {
      name: '餐费明细',
      data: data
    }
  ];
  fs.writeFileSync(userInfo.username + '.xlsx', node_xlsx.build(obj), 'binary');
}

// 下载生成的excel文件
function downloadFile(res, userInfo) {
  // application/octet-stream 表明用流的形式下载文件，任意形式的文件都可以
  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment;filename=' + userInfo.username + ".xlsx");
  var fileStream = fs.createReadStream('./' + userInfo.username + '.xlsx');
  fileStream.on('data', function (data) {
    res.write(data, 'binary');
  });
  fileStream.on('end', function () {
    res.end();
    console.log('The file has been downloaded successfully!');
  });
}

var server = app.listen(8010, function () {
  console.log('8010 port are running now!');
});
