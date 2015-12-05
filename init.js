var http = require('http')
var url = require('url')
var path = require('path')
var fs = require('fs')
var swig = require('swig')
var marked = require('marked')
var config = require('./config.json')
var FileCache = {}

function log(str, color) {
  if (color) {
    console.log("\033[1;3"+color+"m"+str+"\033[0m")
  } else {
    console.log(str)
  }
}

function fetchFileFromDisc(fullPath, callback, processFunc) {
  console.log('read from disc');
  fs.readFile(fullPath, function (err, data) {
    if (err) {
      if (callback) {
        callback(false)
      }
    } else {
      if (processFunc) {
        data = processFunc(data)
      }
      FileCache[fullPath] = data

      if (callback) {
        callback(data)
      }
      var watchTimeout = false
      fs.watch(fullPath, {persistent: true}, function (curr, prev) {
        if (watchTimeout) {
          return
        }
        watchTimeout = setTimeout(function() {
          console.log(fullPath.match(/\/([^\/]+)$/)[1] + ' changed');
          delete FileCache[fullPath]
          fetchFileFromDisc(fullPath, false, processFunc)
        }, 300)
      });
    }
  })
}

function fetchFile(filePath, fromDir, callback, processFunc) {
  var fullPath = path.resolve(__dirname, fromDir+'/'+filePath);
  if (fullPath.indexOf(__dirname+'/'+fromDir+'/') !== 0) {
    console.log('possible hack attack, address requested: ', fullPath);
    return false;
  }
  if (FileCache[fullPath]) {
    callback(FileCache[fullPath])
  } else {
    fetchFileFromDisc(fullPath, callback, processFunc)
  }
}

function parseTemplate(fileName, callback) {
  fetchFile(fileName, 'templates', callback, function(data) {
    return swig.compile(data.toString())
  });
}

function parsePage(fileName, callback) {
  fetchFile(fileName, 'pages', callback, function(data) {
    return marked(data.toString())
  });
}

function getFiles(dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = files[i];
        files_.push(name.replace(/\.[^/.]+$/, ""));
    }
    return files_;
}

function processRequest(filePath, res) {
  filePath = filePath.slice(1);
  var route = {'': 'index', 'index.html': 'index', 'index.htm': 'index'}
  if (route[filePath]) {
    filePath = route[filePath]
  }

  var supportedFiles = {
    'css': 'text/css',
    'js': 'text/javascript',
    'ico': 'image/x-icon',
    'eot': 'application/vnd.ms-fontobject',
    'svg': 'image/svg+xml',
    'ttf': 'application/font-sfnt',
    'woff': 'application/font-woff',
    'woff2': 'application/font-woff',
    'map': 'application/json',
  }
  var fileRes = filePath.match(/\.([a-z]+)$/)

  //console.log(file)
  if (fileRes && supportedFiles[fileRes[1]]) {
    if (supportedFiles[fileRes[1]]) {
      fetchFile(filePath, 'static', function(content) {
        if (content) {
          res.writeHead(200, {'Content-Type': supportedFiles[fileRes[1]]})
          res.write(content);
        } else {
          console.log(404, filePath);
          res.writeHead(404, {"Content-Type": "text/plain"})
          res.write("404 Not Found\n");
        }
        res.end();
      })
    } else {
      console.log(404, filePath);
      res.writeHead(404, {"Content-Type": "text/plain"})
      res.write("404 Unsupported type\n");
    }
  } else {

    
    
  var fullPath = __dirname+'/pages/'+filePath;
  var layout = 'index.html';
  var params = {title:'Nodejs.ru'};

  fs.exists(fullPath, function(exists){
    if(exists){
      if(fs.lstatSync(fullPath).isDirectory()){
        layout = 'category.html';
        params.files = getFiles(fullPath);
        params.category = filePath;
      }
    }

    parseTemplate(layout, function(index) {

      parsePage(filePath+'.md', function(content) {
        params.content = content?content:'Not found';
          res.write(index(params));
          res.end(); 
        })
      })
  
    
  });
            
      
      

    
    
  }
}

var srv = http.createServer(function(req, res) {
  var uri = url.parse(req.url)
  processRequest(uri.pathname, res)
})

srv.listen(config.port, '127.0.0.1');
log('Server has been started at port: '+config.port, 2);
