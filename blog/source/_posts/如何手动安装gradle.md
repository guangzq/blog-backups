---
title: 如何手动安装gradle
date: 2017-02-14 13:45:13
tags:
---
在运行[lottie-android](https://github.com/airbnb/lottie-android)时，项目导不进AS中，推测应该是电脑本地中没有所需的gradle版本，在线下载太慢，所以选择离线安装，安装步骤如下

<img src="/images/lottie.gif" width = "800" height = "600" align=center />

<!-- more -->

## 下载gradle

[https://services.gradle.org/distributions](https://services.gradle.org/distributions)下载所需版本

## 配置方法

项目一导入就已经在下载gradle了，这时候中断导入，强制关闭AS，然后后在 ~\\.gradle\wrapper\dists相应的gradle版本下生成两个文件，将后缀为.part的文件删除，将所下载的.zip放在该目录下*注意不要解压* 

## 后记

lottle-android是一个优秀的安卓动画解决方案，动画流畅而且效率较高，唯一的难点是UI设计师需要设计出优秀的动画从而形成json