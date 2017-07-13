---
title: 使用RxJava解决实际问题
date: 2017-02-17 16:51:35
tags:
---

[RxJava](https://github.com/ReactiveX/RxJava)学习有段时间了，项目中也有许多场景用到，比如防止多次点击，最近有个场景，日志的压缩上传，首先需要考虑压缩与上传不能同步执行，而且都需要在io线程中操作，并且要等待压缩后才能上传，获取不到压缩结束的状态，所以考虑压缩这一操作所在的线程结束，也就意味着压缩的结束，然后再执行上传操作，一开始是这样写的：

<img src="/images/rxjava.png" width = "800" height = "600" align=center />

<!-- more -->

```
Thread thread = new Thread(new Runnable() {
            @Override
            public void run() {
                //TODO 压缩
            }
        });
        thread.start();
        try {
            thread.join();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        //TODO 上传操作
```
此处用join表示执行完子线程再向下执行，然而却造成了anr,应该是线程阻塞引起的

考虑到RxJava正是以异步著称的库，就是就改用RxJava来实现，用trampoline来实现这一需求再好不过了

> Schedulers.trampoline( )
> 当其它排队的任务完成后，在当前线程排队开始执行

用RxJava实现的代码
	
```
		Scheduler scheduler = Schedulers.trampoline();
        Scheduler.Worker worker = scheduler.createWorker();
        worker.schedule(() -> Schedulers.io().createWorker().schedule(() -> {
            L.line("start_zip");
            //TODO 压缩
            worker.schedule(() -> {
                L.line("ziping");
                 //TODO 上传操作
                L.line("zip_end");
        }));

```

## 后记

[RxJava](https://github.com/ReactiveX/RxJava)是个异步解决复杂流程的极好的库，是时候总结一波了
	



