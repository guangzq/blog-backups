var exec = require('child_process').exec;
hexo.on('new', function(data){
    exec('open -a "/Users/boxfish/Downloads/MacDown.app" ' + data.path);
});
