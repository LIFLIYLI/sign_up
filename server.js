var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if(!port){
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

let sessions={}

var server = http.createServer(function(request, response){
  var parsedUrl = url.parse(request.url, true)
  var path = request.url 
  var query = ''
  if(path.indexOf('?') >= 0){ query = path.substring(path.indexOf('?')) }
  var pathNoQuery = parsedUrl.pathname
  var queryObject = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/
console.log(path,method)
  if(path == '/'){
    let string=fs.readFileSync('./index.html','utf8')
    let cookies=''
    if(request.headers.cookie){
      cookies= request.headers.cookie.split('; ')
    }
    
    let hash={}
    for(let i=0;i<cookies.length;i++){
      let parts=cookies[i].split('=')
      let key=parts[0]
      let value=parts[1]
      hash[key]=value
    }
    let mySession=sessions[hash.sessionId]//用内存存起来，不然缓存会被删除
    let email
    if(mySession){
      email=mySession.sign_in_email
    }
    let users=fs.readFileSync('./db/users','utf8')
    users=JSON.parse(users)
    let foundUser
    for(let i=0;i<users.length;i++){
      if(users[i].email===email){
        foundUser=users[i]
        break
      }
    }
    if(foundUser){
      string=string.replace('__user__',foundUser.email)
      .replace('__password__',foundUser.password)
    }else{
      string=string.replace('__user__','错误的用户信息')
      .replace('__password__','不知道')
    }
    request.status=200 //????
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.setHeader("Access-Control-Allow-Origin", "*")//跨域
    response.write(string)
    response.end()

  }else if(path==='/sign_up' && method==='GET'){
    let string=fs.readFileSync('./sign_up.html','utf8')//读取目录文本下的内容
    response.statusCode=200 
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(string)
    response.end()
  }else if(path==='/sign_up' && method==='POST'){
    readyBody(request).then((body)=>{
      let strings=body.split('&')
      let hash={}
      strings.forEach((string)=>{
        let parts=string.split('=')
        key=parts[0]
        value=parts[1]
        hash[key]=decodeURIComponent(value)
      })
      let {email,password,password_confirmation}=hash
      if(email.indexOf('@')===-1){
        response.statusCode=400
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.write(`{
          "errors":{
            "email":"bad"
          }
        }`)
      }else if(password !==password_confirmation){
        response.statusCode=400
        response.write('password is not  alike')
        
      }else{
        var users=fs.readFileSync('./db/users','utf8')
        try{
          users=JSON.parse(users)//如果这一步失败，就执行catch
        }catch(exception){ 
          users=[]
        }
        let inUse=false
        for(let i=0;i<users.length;i++){
          let user=users[i]
          if(user.email===email){
            inUse=true
            break;
          }
        }  
        if(inUse){
          response.statusCode=400
          response.write('email in use')
        }else{
          users.push({email:email,password:password})
          var usersString=JSON.stringify(users)
          fs.writeFileSync('./db/users',usersString)     
          response.statusCode===200
        }       
      }
      response.end()
    })
   
    
  }

  else if(path==='/sign_in' && method==='GET'){
    let string=fs.readFileSync('./sign_in.html','utf8')//读取目录文本下的内容
    response.statusCode=200 
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.write(string)
    response.end()
  }else if(path==='/sign_in' && method==='POST'){  //用户登录
    readyBody(request).then((body)=>{
      let strings=body.split('&')
      let hash={}
      strings.forEach((string)=>{
        let parts=string.split('=')
        key=parts[0]
        value=parts[1]
        hash[key]=decodeURIComponent(value)
      })
      let {email,password}=hash
      var users=fs.readFileSync('./db/users','utf8')
      try{
        users=JSON.parse(users)
      }catch(exception){
        users=[]
      }
      let found
      for(let i=0;i<users.length;i++){
        if(users[i].email===email&&users[i].password===password){
          found=true
          break
        }
      }
      if(found){
        let sessionId=Math.random()*100000    //Math.random()可以产生一个随机小数
        sessions[sessionId]={sign_in_email: email}
        response.setHeader('Set-Cookie',`sessionId=${sessionId};httpOnly`)
        response.statusCode=200
      }else{
        response.statusCode=400
      }
      response.end()
    })

  }
  
  else{
    response.statusCode = 404
    response.end()
  }




  /******** 代码结束，下面不要看 ************/
})
function readyBody(request){
  return new Promise((resolve,reject)=>{
    let body=[]   //请求体
    request.on('data',(chunk)=>{//POST每次上传只有一小部分，所以把没部分chunk都PUSH进body
      body.push(chunk)
    }).on('end',()=>{//监听PUSH事件结束后
      body=Buffer.concat(body).toString()//转换body的格式
      resolve(body)
    })
  })
  
}
server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)

