const fs = require('fs');
const xlsx = require('node-xlsx');
let obj = [
  {
    name: 'firstSheet',
    data: [
      ['姓名', '工作日期', '最早签到时间', '最晚签到时间', '工作时长', '金额'],
      ['hello', 'world']
    ]
  },
  {
    name: 'secondSheet',
    data: [
      ['nice', 'to', 'meet', 'you']
    ]
  },
];

fs.writeFileSync('hello.xlsx', xlsx.build(obj), 'binary');