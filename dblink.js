const mysql = require('mysql');
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  port: '3306',
  database : 'reimburse'
});

module.exports = connection;

// var  sql = 'SELECT * FROM user';
// //查
// connection.query(sql,function (err, result) {
//         if(err){
//           console.log('[SELECT ERROR] - ',err.message);
//           return;
//         }

//       // [ RowDataPacket { id: 1, username: 'aaa', password: '123' } ]
//       // 查询结果：每一条数据就是一个RowDataPacker对象
//        console.log('--------------------------SELECT----------------------------');
//        console.log(result);
//        console.log('------------------------------------------------------------\n\n');  
// });

// connection.end();