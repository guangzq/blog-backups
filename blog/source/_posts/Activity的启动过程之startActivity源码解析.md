---
title: Activity的启动过程之startActivit源码解析
date: 2017-03-15 16:51:35
tags:
---

## 一.概述
本文基于api 24 

startActivity简化版流程图 
<img src="/images/startActivity.png" width = "800" height = "600" align=center />

<!-- more -->

## 二.源码解析

以startActivity为入口

方法：Activity->startActivity

```
@Override                                 
public void startActivity(Intent intent) {
    this.startActivity(intent, null);     
}

@Override                                                             
public void startActivity(Intent intent, @Nullable Bundle options) {  
    if (options != null) {                                            
        startActivityForResult(intent, -1, options);                  
    } else {                                                          
        // Note we want to go through this call for compatibility with
        // applications that may have overridden the method.          
        startActivityForResult(intent, -1);                           
    }                                                                 
} 

public void startActivityForResult(@RequiresPermission Intent intent, int requestCode) {
    startActivityForResult(intent, requestCode, null);                                  
}                                                                                                                                                                                                    
```
最终方法都是调用的startActivityForResult，继续看：

方法：Acticity->startActivityForResult

```
public void startActivityForResult(@RequiresPermission Intent intent, int requestCode,                                                 
                                   @Nullable Bundle options) {                                                                         
    //mParent常用于ActivityGroup,但是ActivityGroup已废弃，所以一般的Activity都是走这里                                                                    
    if (mParent == null) {                                                                                                             
        //启动一个新的Activity,核心功能位于mMainThread.getApplicationThread()。Instrumentation类是用于监视system和application交互的类。在最终启动activity
        //的地方会用到Instrumentation                         
        Instrumentation.ActivityResult ar =                                                                                            
                mInstrumentation.execStartActivity(                                                                                    
                        this, mMainThread.getApplicationThread(), mToken, this,                                                        
                        intent, requestCode, options);                                                                                 
        if (ar != null) {                                                                                                              
            //发送调用onActivityResult的消息                                                                                                  
            mMainThread.sendActivityResult(                                                                                            
                    mToken, mEmbeddedID, requestCode, ar.getResultCode(),                                                              
                    ar.getResultData());                                                                                               
        }                                                                                                                              
        if (requestCode >= 0) {                                                                                                        
            // If this start is requesting a result, we can avoid making                                                               
            // the activity visible until the result is received.  Setting                                                             
            // this code during onCreate(Bundle savedInstanceState) or onResume() will keep the                                        
            // activity hidden during this time, to avoid flickering.                                                                  
            // This can only be done when a result is requested because                                                                
            // that guarantees we will get information back when the                                                                   
            // activity is finished, no matter what happens to it.                                                                     
            //这段主要是讲：在result接收到之前避免acitity出现，在onCreate或者onResume期间设置可以是acticity隐藏，避免闪烁                                                 
            mStartedActivity = true;                                                                                                   
        }                                                                                                                              
        cancelInputsAndStartExitTransition(options);                                                                                   
        // TODO Consider clearing/flushing other event sources and events for child windows.                                           
    } else {                                                                                                                           
        //ActitityGroup内部的Activity则会走这里，实现方式其实是一样的                                                                                     
        if (options != null) {                                                                                                         
            mParent.startActivityFromChild(this, intent, requestCode, options);                                                        
        } else {                                                                                                                       
            // Note we want to go through this method for compatibility with                                                           
            // existing applications that may have overridden it.                                                                      
            mParent.startActivityFromChild(this, intent, requestCode);                                                                 
        }                                                                                                                              
    }                                                                                                                                  
}
```
既然真正执行打开Activity是在execStartActivity实现的，那么继续看execStartActivity

方法：Instrumentation->execStartActivity

```
public ActivityResult execStartActivity(                                              
        Context who, IBinder contextThread, IBinder token, Activity target,           
        Intent intent, int requestCode, Bundle options) {                             
    IApplicationThread whoThread = (IApplicationThread) contextThread;                
    Uri referrer = target != null ? target.onProvideReferrer() : null;                
    if (referrer != null) {                                                           
        intent.putExtra(Intent.EXTRA_REFERRER, referrer);                             
    }                                                                                 
    if (mActivityMonitors != null) {                                                  
        synchronized (mSync) {                                                        
            //遍历ActivityMonitor,看是否存在这个Activity                                       
            final int N = mActivityMonitors.size();                                   
            for (int i=0; i<N; i++) {                                                 
                final ActivityMonitor am = mActivityMonitors.get(i);                  
                if (am.match(who, null, intent)) {                                    
                    am.mHits++;                                                       
                    //如果//当该monitor阻塞activity启动,也就是目标Activity无法打开就直接return                                         
                    if (am.isBlocking()) {                                            
                        return requestCode >= 0 ? am.getResult() : null;              
                    }                                                                 
                    //如果存在就跳出循环                                                       
                    break;                                                            
                }                                                                     
            }                                                                         
        }                                                                             
    }                                                                                 
    try {                                                                             
        intent.migrateExtraStreamToClipData();                                        
        intent.prepareToLeaveProcess(who);                                            
        //真正的startActivity的方法，其实核心功能在whoThread的scheduleLaunchActivity完成的              
        int result = ActivityManagerNative.getDefault()                               
            .startActivity(whoThread, who.getBasePackageName(), intent,               
                    intent.resolveTypeIfNeeded(who.getContentResolver()),             
                    token, target != null ? target.mEmbeddedID : null,                
                    requestCode, 0, null, options);                                   
        //用于检查打开Activity异常的方法，比如常见的Activity没在AndroidManifest的话，                       
        // 会抛出“...have you declared this activity in your AndroidManifest.xml?”异常     
        checkStartActivityResult(result, intent);                                     
    } catch (RemoteException e) {                                                     
        throw new RuntimeException("Failure from system", e);                         
    }                                                                                 
    return null;                                                                      
}                                                                                     
```
补充checkStartActivityResult方法，内部实现是各种情况下需要抛出的异常信息

```
public static void checkStartActivityResult(int res, Object intent) {                       
    if (res >= ActivityManager.START_SUCCESS) {                                             
        return;                                                                             
    }                                                                                       
                                                                                            
    switch (res) {                                                                          
        case ActivityManager.START_INTENT_NOT_RESOLVED:                                     
        case ActivityManager.START_CLASS_NOT_FOUND:                                         
            if (intent instanceof Intent && ((Intent)intent).getComponent() != null)        
                throw new ActivityNotFoundException(                                        
                        "Unable to find explicit activity class "                           
                        + ((Intent)intent).getComponent().toShortString()                   
                        + "; have you declared this activity in your AndroidManifest.xml?");
            throw new ActivityNotFoundException(                                            
                    "No Activity found to handle " + intent);                               
        case ActivityManager.START_PERMISSION_DENIED:                                       
            throw new SecurityException("Not allowed to start activity "                    
                    + intent);                                                              
        case ActivityManager.START_FORWARD_AND_REQUEST_CONFLICT:                            
            throw new AndroidRuntimeException(                                              
                    "FORWARD_RESULT_FLAG used while also requesting a result");             
        case ActivityManager.START_NOT_ACTIVITY:                                            
            throw new IllegalArgumentException(                                             
                    "PendingIntent is not an activity");                                    
        case ActivityManager.START_NOT_VOICE_COMPATIBLE:                                    
            throw new SecurityException(                                                    
                    "Starting under voice control not allowed for: " + intent);             
        case ActivityManager.START_VOICE_NOT_ACTIVE_SESSION:                                
            throw new IllegalStateException(                                                
                    "Session calling startVoiceActivity does not match active session");    
        case ActivityManager.START_VOICE_HIDDEN_SESSION:                                    
            throw new IllegalStateException(                                                
                    "Cannot start voice activity on a hidden session");                     
        case ActivityManager.START_CANCELED:                                                
            throw new AndroidRuntimeException("Activity could not be started for "          
                    + intent);                                                              
        default:                                                                            
            throw new AndroidRuntimeException("Unknown error code "                         
                    + res + " when starting " + intent);                                    
    }                                                                                       
}

```

接上文的startActivity，是定义在接口IActivityManager的方法，该方法的实现类是定义在ActivityManagerNative类的内部类ActivityManagerProxy

方法：ActivityManagerProxy->startActivity

```
public int startActivity(IApplicationThread caller, String callingPackage, Intent intent,  
        String resolvedType, IBinder resultTo, String resultWho, int requestCode,          
        int startFlags, ProfilerInfo profilerInfo, Bundle options) throws RemoteException {
    Parcel data = Parcel.obtain();                                                         
    Parcel reply = Parcel.obtain();                                                        
    data.writeInterfaceToken(IActivityManager.descriptor);                                 
    data.writeStrongBinder(caller != null ? caller.asBinder() : null);                     
    data.writeString(callingPackage);                                                      
    intent.writeToParcel(data, 0);                                                         
    data.writeString(resolvedType);                                                        
    data.writeStrongBinder(resultTo);                                                      
    data.writeString(resultWho);                                                           
    data.writeInt(requestCode);                                                            
    data.writeInt(startFlags);                                                             
    if (profilerInfo != null) {                                                            
        data.writeInt(1);                                                                  
        profilerInfo.writeToParcel(data, Parcelable.PARCELABLE_WRITE_RETURN_VALUE);        
    } else {                                                                               
        data.writeInt(0);                                                                  
    }                                                                                      
    if (options != null) {                                                                 
        data.writeInt(1);                                                                  
        options.writeToParcel(data, 0);                                                    
    } else {                                                                               
        data.writeInt(0);                                                                  
    }                                                                                      
    mRemote.transact(START_ACTIVITY_TRANSACTION, data, reply, 0);                          
    reply.readException();                                                                 
    int result = reply.readInt();                                                          
    reply.recycle();                                                                       
    data.recycle();                                                                        
    return result;                                                                         
}
```
参数众多，这里重点关注IApplicationThread参数，是个接口，关键方法scheduleLaunchActivity，实现和继承如下：

```
public abstract class ApplicationThreadNative extends Binder implements IApplicationThread
private class ApplicationThread extends ApplicationThreadNative
```
方法：ActivityThread->ApplicationThread->scheduleLaunchActivity

```
@Override                                                                                
public final void scheduleLaunchActivity(Intent intent, IBinder token, int ident,        
        ActivityInfo info, Configuration curConfig, Configuration overrideConfig,        
        CompatibilityInfo compatInfo, String referrer, IVoiceInteractor voiceInteractor, 
        int procState, Bundle state, PersistableBundle persistentState,                  
        List<ResultInfo> pendingResults, List<ReferrerIntent> pendingNewIntents,         
        boolean notResumed, boolean isForward, ProfilerInfo profilerInfo) {              
                                                                                         
    updateProcessState(procState, false);                                                
                                                                                         
    ActivityClientRecord r = new ActivityClientRecord();                                 
                                                                                         
    r.token = token;                                                                     
    r.ident = ident;                                                                     
    r.intent = intent;                                                                   
    r.referrer = referrer;                                                               
    r.voiceInteractor = voiceInteractor;                                                 
    r.activityInfo = info;                                                               
    r.compatInfo = compatInfo;                                                           
    r.state = state;                                                                     
    r.persistentState = persistentState;                                                 
                                                                                         
    r.pendingResults = pendingResults;                                                   
    r.pendingIntents = pendingNewIntents;                                                
                                                                                         
    r.startsNotResumed = notResumed;                                                     
    r.isForward = isForward;                                                             
                                                                                         
    r.profilerInfo = profilerInfo;                                                       
                                                                                         
    r.overrideConfig = overrideConfig;                                                   
    updatePendingConfiguration(curConfig);                                               
                                                                                         
    sendMessage(H.LAUNCH_ACTIVITY, r);                                                   
} 
```
这个方法主要是用来记录activity的各种参数，然后发送启动activity的消息，接着看这一消息的实现

```
private class H extends Handler {
	public void handleMessage(Message msg) {                                         
    if (DEBUG_MESSAGES) Slog.v(TAG, ">>> handling: " + codeToString(msg.what));  
    switch (msg.what) {                                                          
        case LAUNCH_ACTIVITY: {                                                  
            Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityStart"); 
            final ActivityClientRecord r = (ActivityClientRecord) msg.obj;       
                                                                                 
            r.packageInfo = getPackageInfoNoCheck(                               
                    r.activityInfo.applicationInfo, r.compatInfo);
            //处理LAUNCH_ACTIVITY的消息               
            handleLaunchActivity(r, null, "LAUNCH_ACTIVITY");                    
            Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);                    
        } break;                                                                
}


``` 

真正的处理启动Activity的逻辑来了

方法：ActvityThread->performLaunchActivity


```
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {                                                
    // System.out.println("##### [" + System.currentTimeMillis() + "] ActivityThread.performLaunchActivity(" + r + ")");             
    //解析启动Activity的相关信息，包括component和packageInfo                                                                                      
    ActivityInfo aInfo = r.activityInfo;                                                                                             
    if (r.packageInfo == null) {                                                                                                     
        r.packageInfo = getPackageInfo(aInfo.applicationInfo, r.compatInfo,                                                          
                Context.CONTEXT_INCLUDE_CODE);                                                                                       
    }                                                                                                                                
```
```                                                                                                                                     
    ComponentName component = r.intent.getComponent();                                                                               
    if (component == null) {                                                                                                         
        component = r.intent.resolveActivity(                                                                                        
            mInitialApplication.getPackageManager());                                                                                
        r.intent.setComponent(component);                                                                                            
    }                                                                                                                                
                                                                                                                                     
    if (r.activityInfo.targetActivity != null) {                                                                                     
        component = new ComponentName(r.activityInfo.packageName,                                                                    
                r.activityInfo.targetActivity);                                                                                      
    }                                                                                                                                
    //通过ClassLoader将目标activity加载进来，并实例化一个activity对象                                                                                  
    Activity activity = null;                                                                                                        
    try {                                                                                                                            
        java.lang.ClassLoader cl = r.packageInfo.getClassLoader();                                                                   
        activity = mInstrumentation.newActivity(                                                                                     
                cl, component.getClassName(), r.intent);                                                                             
        StrictMode.incrementExpectedActivityCount(activity.getClass());                                                              
        r.intent.setExtrasClassLoader(cl);                                                                                           
        r.intent.prepareToEnterProcess();                                                                                            
        if (r.state != null) {                                                                                                       
            r.state.setClassLoader(cl);                                                                                              
        }                                                                                                                            
    } catch (Exception e) {                                                                                                          
        if (!mInstrumentation.onException(activity, e)) {                                                                            
            throw new RuntimeException(                                                                                              
                "Unable to instantiate activity " + component                                                                        
                + ": " + e.toString(), e);                                                                                           
        }                                                                                                                            
    }                                                                                                                                
                                                                                                                                     
    try {                                                                                                                            
        //创建Application对象                                                                                                            
        Application app = r.packageInfo.makeApplication(false, mInstrumentation);                                                    
                                                                                                                                     
        if (localLOGV) Slog.v(TAG, "Performing launch of " + r);                                                                     
        if (localLOGV) Slog.v(                                                                                                       
                TAG, r + ": app=" + app                                                                                              
                + ", appName=" + app.getPackageName()                                                                                
                + ", pkg=" + r.packageInfo.getPackageName()                                                                          
                + ", comp=" + r.intent.getComponent().toShortString()                                                                
                + ", dir=" + r.packageInfo.getAppDir());                                                                             
                                                                                                                                     
        if (activity != null) {                                                                                                      
            //创建activity的上下文信息                                                                                                       
            Context appContext = createBaseContextForActivity(r, activity);                                                          
            CharSequence title = r.activityInfo.loadLabel(appContext.getPackageManager());                                           
            Configuration config = new Configuration(mCompatConfiguration);                                                          
            if (r.overrideConfig != null) {                                                                                          
                config.updateFrom(r.overrideConfig);                                                                                 
            }                                                                                                                        
            if (DEBUG_CONFIGURATION) Slog.v(TAG, "Launching activity "                                                               
                    + r.activityInfo.name + " with config " + config);                                                               
            Window window = null;                                                                                                    
            if (r.mPendingRemoveWindow != null && r.mPreserveWindow) {                                                               
                window = r.mPendingRemoveWindow;                                                                                     
                r.mPendingRemoveWindow = null;                                                                                       
                r.mPendingRemoveWindowManager = null;                                                                                
            }                                                                                                                        
            //将context和activity的相关信息通过attach设置到目标activity中去                                                                          
            activity.attach(appContext, this, getInstrumentation(), r.token,                                                         
                    r.ident, app, r.intent, r.activityInfo, title, r.parent,                                                         
                    r.embeddedID, r.lastNonConfigurationInstances, config,                                                           
                    r.referrer, r.voiceInteractor, window);                                                                          
                                                                                                                                     
            if (customIntent != null) {                                                                                              
                activity.mIntent = customIntent;                                                                                     
            }                                                                                                                        
            r.lastNonConfigurationInstances = null;                                                                                  
            activity.mStartedActivity = false;                                                                                       
            int theme = r.activityInfo.getThemeResource();                                                                           
            if (theme != 0) {                                                                                                        
                activity.setTheme(theme);                                                                                            
            }                                                                                                                        
                                                                                                                                     
            activity.mCalled = false;                                                                                                
            if (r.isPersistable()) {                                                                                                 
                //通过mInstrumentation的callActivityOnCreate来间接调用目标activity的onCreate方法                                                  
                mInstrumentation.callActivityOnCreate(activity, r.state, r.persistentState);                                         
            } else {                                                                                                                 
                mInstrumentation.callActivityOnCreate(activity, r.state);                                                            
            }                                                                                                                        
            if (!activity.mCalled) {                                                                                                 
                throw new SuperNotCalledException(                                                                                   
                    "Activity " + r.intent.getComponent().toShortString() +                                                          
                    " did not call through to super.onCreate()");                                                                    
            }                                                                                                                        
            r.activity = activity;                                                                                                   
            r.stopped = true;                                                                                                        
            if (!r.activity.mFinished) {                                                                                             
                activity.performStart();                                                                                             
                r.stopped = false;                                                                                                   
            }                                                                                                                        
            if (!r.activity.mFinished) {                                                                                             
                if (r.isPersistable()) {                                                                                             
                    if (r.state != null || r.persistentState != null) {                                                              
                        mInstrumentation.callActivityOnRestoreInstanceState(activity, r.state,                                       
                                r.persistentState);                                                                                  
                    }                                                                                                                
                } else if (r.state != null) {                                                                                        
                    mInstrumentation.callActivityOnRestoreInstanceState(activity, r.state);                                          
                }                                                                                                                    
            }                                                                                                                        
            if (!r.activity.mFinished) {                                                                                             
                activity.mCalled = false;                                                                                            
                if (r.isPersistable()) {                                                                                             
                    mInstrumentation.callActivityOnPostCreate(activity, r.state,                                                     
                            r.persistentState);                                                                                      
                } else {                                                                                                             
                    mInstrumentation.callActivityOnPostCreate(activity, r.state);                                                    
                }                                                                                                                    
                if (!activity.mCalled) {                                                                                             
                    throw new SuperNotCalledException(                                                                               
                        "Activity " + r.intent.getComponent().toShortString() +                                                      
                        " did not call through to super.onPostCreate()");                                                            
                }                                                                                                                    
            }                                                                                                                        
        }                                                                                                                            
        r.paused = true;                                                                                                             
                                                                                                                                     
        mActivities.put(r.token, r);                                                                                                 
                                                                                                                                     
    } catch (SuperNotCalledException e) {                                                                                            
        throw e;                                                                                                                     
                                                                                                                                     
    } catch (Exception e) {                                                                                                          
        if (!mInstrumentation.onException(activity, e)) {                                                                            
            throw new RuntimeException(                                                                                              
                "Unable to start activity " + component                                                                              
                + ": " + e.toString(), e);                                                                                           
        }                                                                                                                            
    }                                                                                                                                
                                                                                                                                     
    return activity;                                                                                                                 
}
```
performLaunchActivity的主要逻辑有三点：

* 解析启动Activity的相关信息，包括component和packageInfo 
* 通过ClassLoader将目标activity加载进来，并实例化一个activity对象 
* 通过mInstrumentation的callActivityOnCreate来间接调用目标activity的onCreate方法，然后就是走activity的声明周期了

## 3.总结


                                                                                                                               

                                                                                      
                                                                                                 

                                                                                                                                                                                                                                                                                                            

