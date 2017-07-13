---
title: Mac上搭建基于GitHub Page的Hexo博客
date: 2014-01-20 16:24:11
tags:
- Mac
- Hexo
---
## 概述
>最近一直想搭建自己的独立博客，在看了好多教程和踩坑之后，终于把博客搭建起来了，博客是基于Hexo+npm+git搭建的，建议之前还是有点基础比较好，要不然环境的搭建就比较麻烦



## 环境准备
*  <font size=5>git</font>

<img src="/images/git.png" width = "800" height = "600" align=center />

*  <font size=5>Node.js</font>
*  <font size=5>Hexo</font>

<!-- more -->

## 步骤

### Node.js
用来生成静态页面,从官网下载的会报错，所以建议使用淘宝的npm源
在brew命令（以下命令都是基于brew）

```
npm install -g cnpm --registry=https://registry.npm.taobao.org

```
### git

用来将本地Hexo内容提交到Github上。Xcode自带Git，这里不再赘述

### Hexo
Node.js和git都配置好之后，就可以安装Hexo了，执行命令

```
sudo npm install -g hexo

```
#### 初始化

终端cd到一个你选定的目录，执行hexo init命令：

```
hexo init blog

```
blog是你建立的文件夹名称。cd到blog文件夹下，执行如下命令，安装npm：

```
npm install

```
执行如下命令，开启hexo服务器：

```
hexo s

```

### 优化细节

#### 图片如何调整大小

在markdown语法中，一个方法之一是可以通过使用*img标签*

```
<img src="./xxx.png" width = "300" height = "200" alt="图片名称" align=center />

```

#### Mac下如何自动打开*MarkDown编辑器*

* 首先在Hexo目录下的scripts目录中创建一个JavaScript脚本文件。如果没有这个scripts目录，则新建一个。名字任取。
* 在所创建的脚本*.js*中写入：

```
var exec = require('child_process').exec;
// Hexo 2.x 用户复制这段
hexo.on('new', function(path){
    exec('open -a "markdown编辑器绝对路径.app" ' + path);
});
// Hexo 3 用户复制这段
hexo.on('new', function(data){
    exec('open -a "markdown编辑器绝对路径.app" ' + data.path);
});

```
不用通过`hexo g`就可以立即生效，可以创建一个文件试一下