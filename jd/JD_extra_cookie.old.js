/*

Author: 2Ya
Github: https://github.com/domping

===================
使用方式：打开京东app 会获取 wskey ，在 我的>点击头像，页面 自动获取 cookie
若弹出成功则正常使用。否则继续再此页面继续刷新一下试试
===================

 */

const APIKey = "CookiesJD";
const $ = new API("ql", false);
const CacheKey = `#${APIKey}`;
const version = 'v1.2.7';
$.KEY_sessions = "#chavy_boxjs_sessions";
console.log(`JDExtraCookie开始！version: ${version}, request: ${$request?.url || ''}`);

const jdHelp = JSON.parse($.read("#jd_ck_remark") || "{}");
let remark = [];
try {
  remark = JSON.parse(jdHelp.remark || "[]");
} catch (e) {
  console.log("解析 jdHelp.remark 失败:", e);
}

// 安全获取用户名，避免match失败报错
function getUsername(ck) {
  if (!ck) return "";
  const match = ck.match(/(pt_)?pin=([^; ]+)(?=;?)/);
  return match ? decodeURIComponent(match[2]) : "";
}

async function getScriptUrl() {
  const response = await $.http.get({
    url: "https://raw.githubusercontent.com/netcookies/Script/master/jd/ql_api.js",
  });
  return response.body;
}

const mute = "#cks_get_mute";
$.mute = $.read(mute);

(async () => {
  const ql_script = (await getScriptUrl()) || "";
  eval(ql_script);
  if ($.ql?.initial instanceof Function) {
    await $.ql.initial();
  } else {
    console.warn("$.ql.initial 方法不存在或不是函数");
  }

  if ($.ql) {
    $.ql.asyncCookie = async (cookieValue, name = "JD_WSCK") => {
      try {
        $.info(`青龙${name}登陆同步`);
        let qlCkRes = await $.ql.select(name);
        if (!qlCkRes?.data) {
          $.info(`青龙查询${name}返回空`);
          return;
        }
        let qlCk = qlCkRes.data;
        const DecodeName = getUsername(cookieValue);
        const current = qlCk.find((item) => getUsername(item.value) === DecodeName);
        if (current && current.value === cookieValue) {
          $.info("该账号无需更新");
          return;
        }

        let remarks = "";
        let remarkObj = remark.find((item) => item.username === DecodeName);
        if (remarkObj) {
          const nickname = remarkObj.nickname || "";
          const customRemark = remarkObj.remark || "";
          const qywxUserId = remarkObj.qywxUserId || "";

          if (name === "JD_WSCK") {
            remarks = nickname;
          } else {
            const parts = [nickname, customRemark, qywxUserId].filter(Boolean);
            remarks = parts.join("&");
          }
        }

        let response;
        if (current) {
          current.value = cookieValue;
          response = await $.ql.edit({
            name,
            remarks: current.remarks || remarks,
            value: cookieValue,
            id: current.id,
          });
          if (response?.data?.status === 1) {
            response = await $.ql.enabled([current.id]);
          }
        } else {
          response = await $.ql.add([{ name, value: cookieValue, remarks }]);
        }

        $.info(JSON.stringify(response));
        if ($.mute === "true" && response?.code === 200) {
          return $.info(`用户名: ${DecodeName} 同步${name}更新青龙成功 🎉`);
        } else if (response?.code === 200) {
          $.notify(
            `用户名: ${DecodeName}`,
            $.ql_config?.ip || "",
            `同步${name}更新青龙成功 🎉`
          );
        } else {
          $.error("青龙同步失败");
        }
      } catch (e) {
        $.error("asyncCookie 异常: " + e);
      }
    };
  }
  console.log(`(1)GetCookie - ${$request?.url || ""}`);
  if ($request) await GetCookie();
})()
  .catch((e) => {
    $.log("主流程异常: " + e);
  })
  .finally(() => {
    $.done();
  });

function getCache() {
  return JSON.parse($.read(CacheKey) || "[]");
}

function updateJDHelp(username) {
  if (remark.length) {
    const newRemark = remark.map((item) => {
      if (item.username === username) {
        return { ...item, status: "正常" };
      }
      return item;
    });
    jdHelp.remark = JSON.stringify(newRemark, null, `\t`);
    $.write(JSON.stringify(jdHelp), "#jd_ck_remark");
  }
}

async function GetCookie() {
  const CV = `${$request.headers?.Cookie || $request.headers?.cookie || ""};`;
  console.log(`(2)GetCookie - ${CV}`);

  if (
    $request.url?.indexOf("queryJDUserInfo") > -1 ||
    $request.url?.indexOf("personalCenter") > -1
  ) {
    const ptKeyMatch = CV.match(/pt_key=.+?;/);
    const ptPinMatch = CV.match(/pt_pin=.+?;/);
    if (!ptKeyMatch || !ptPinMatch) {
      console.log("未匹配到 pt_key 或 pt_pin");
      return;
    }
    const CookieValue = ptKeyMatch[0] + ptPinMatch[0];

    if (CookieValue.indexOf("fake_") > -1) {
      return console.log("异常账号");
    }
    const DecodeName = getUsername(CookieValue);
    let updateIndex = -1,
      CookieName = "",
      tipPrefix = "";

    const CookiesData = getCache();
    const updateCookiesData = [...CookiesData];

    CookiesData.forEach((item, index) => {
      if (getUsername(item.cookie) === DecodeName && item.cookie) updateIndex = index;
    });

    if ($.ql) {
      if ($.ql?.initial instanceof Function) await $.ql.initial();
      console.log(`同步 CookieValue: ${CookieValue}`);
      await $.ql.asyncCookie(CookieValue, "JD_COOKIE");
    }

    if (updateIndex !== -1) {
      if (updateCookiesData[updateIndex].cookie !== CookieValue) {
        updateCookiesData[updateIndex].cookie = CookieValue;
        CookieName = `【账号${updateIndex + 1}】`;
        tipPrefix = "更新京东";
      }
    } else {
      updateCookiesData.push({
        userName: DecodeName,
        cookie: CookieValue,
      });
      CookieName = `【账号${updateCookiesData.length}】`;
      tipPrefix = "首次写入京东";
    }
    
    // 只有 tipPrefix 有值时说明需要写入
    if (tipPrefix) {
      $.write(JSON.stringify(updateCookiesData, null, `\t`), CacheKey);
      updateJDHelp(DecodeName);
    
      const msg = `用户名: ${DecodeName} ${tipPrefix}${CookieName}Cookie成功 🎉`;
      if ($.mute === "true") {
        return console.log(msg);
      }
      $.notify(
        `用户名: ${DecodeName}`,
        "",
        msg,
        { "update-pasteboard": CookieValue }
      );
    } else {
      console.log(`Cookie 无变化，跳过写入: ${DecodeName}`);
      return;
    }
  } else if (
    $request.headers &&
    $request.url?.match(/newUserInfo|userBasicInfos/)
  ) {
    const wskeyMatch = CV.match(/wskey=([^=;]+?);/);
    if (!wskeyMatch || !wskeyMatch[1]) {
      console.log("未匹配到 wskey");
      return;
    }
    const wskey = wskeyMatch[1];

    let respBody;
    try {
      respBody = JSON.parse($response.body);
    } catch (e) {
      console.log("解析响应体失败:", e);
      return;
    }

    let pin = "";
    if (respBody.userInfoSns) {
      pin = respBody.userInfoSns.unickName || "";
    }
    if (respBody.basicUserInfo) {
      const nameInfo = respBody.basicUserInfo.find(
        (item) => item.functionId === "nameInfo"
      );
      if (nameInfo) pin = nameInfo.content || pin;
    }

    const code = `pin=${pin};wskey=${wskey};`;
    const username = getUsername(code);

    const CookiesData = getCache();
    let updateIndex = -1;
    console.log(`用户名：${username}`);
    console.log(`同步 wskey: ${code}`);

    CookiesData.forEach((item, index) => {
      if (item.userName === username && item.wskey) {
        updateIndex = index;
      }
    });

    if ($.ql) {
      if ($.ql?.initial instanceof Function) await $.ql.initial();
      console.log(`同步 wskey: ${code}`);
      await $.ql.asyncCookie(code);
    }

    let text ="";
    if (updateIndex === -1) {
      CookiesData.push({
        userName: username,
        wskey: wskey,
      });
      text = `新增`;
    } else {
      if (CookiesData[updateIndex].wskey !== wskey) {
        CookiesData[updateIndex].wskey = wskey;
        text = `修改`;
      }
    }

    if (text) {
      $.write(JSON.stringify(CookiesData, null, `\t`), CacheKey);
      if ($.mute === "true") {
        return console.log(`用户名: ${username} ${text}wskey成功 🎉`);
      }
      return $.notify(`用户名: ${username}`, "", `${text}wskey成功 🎉`, {
        "update-pasteboard": code,
      });
    } else {
      console.log("wskey 无变化，不提示");
      return;
    }
  } else {
    console.log("未匹配到相关信息，退出抓包");
  }
}

/* prettier-ignore */
function ENV(){const isJSBox=typeof require=="function"&&typeof $jsbox!="undefined";return{isQX:typeof $task!=="undefined",isLoon:typeof $loon!=="undefined",isSurge:typeof $httpClient!=="undefined"&&typeof $utils!=="undefined",isBrowser:typeof document!=="undefined",isNode:typeof require=="function"&&!isJSBox,isJSBox,isRequest:typeof $request!=="undefined",isScriptable:typeof importModule!=="undefined",isShadowrocket:"undefined"!==typeof $rocket,isStash:"undefined"!==typeof $environment&&$environment["stash-version"]}}
/* prettier-ignore */
function HTTP(defaultOptions={baseURL:""}){const{isQX,isLoon,isSurge,isScriptable,isNode,isBrowser,isShadowrocket,isStash,}=ENV();const methods=["GET","POST","PUT","DELETE","HEAD","OPTIONS","PATCH"];const URL_REGEX=/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;function send(method,options){options=typeof options==="string"?{url:options}:options;const baseURL=defaultOptions.baseURL;if(baseURL&&!URL_REGEX.test(options.url||"")){options.url=baseURL?baseURL+options.url:options.url}if(options.body&&options.headers&&!options.headers["Content-Type"]){options.headers["Content-Type"]="application/x-www-form-urlencoded"}options={...defaultOptions,...options};const timeout=options.timeout;const events={...{onRequest:()=>{},onResponse:(resp)=>resp,onTimeout:()=>{},},...options.events,};events.onRequest(method,options);let worker;if(isQX){worker=$task.fetch({method,...options})}else if(isLoon||isSurge||isNode||isShadowrocket||isStash){worker=new Promise((resolve,reject)=>{const request=isNode?require("request"):$httpClient;request[method.toLowerCase()](options,(err,response,body)=>{if(err)reject(err);else resolve({statusCode:response.status||response.statusCode,headers:response.headers,body,})})})}else if(isScriptable){const request=new Request(options.url);request.method=method;request.headers=options.headers;request.body=options.body;worker=new Promise((resolve,reject)=>{request.loadString().then((body)=>{resolve({statusCode:request.response.statusCode,headers:request.response.headers,body,})}).catch((err)=>reject(err))})}else if(isBrowser){worker=new Promise((resolve,reject)=>{fetch(options.url,{method,headers:options.headers,body:options.body,}).then((response)=>response.json()).then((response)=>resolve({statusCode:response.status,headers:response.headers,body:response.data,})).catch(reject)})}let timeoutid;const timer=timeout?new Promise((_,reject)=>{timeoutid=setTimeout(()=>{events.onTimeout();return reject(`${method}URL:${options.url}exceeds the timeout ${timeout}ms`)},timeout)}):null;return(timer?Promise.race([timer,worker]).then((res)=>{clearTimeout(timeoutid);return res}):worker).then((resp)=>events.onResponse(resp))}const http={};methods.forEach((method)=>(http[method.toLowerCase()]=(options)=>send(method,options)));return http}
/* prettier-ignore */
function API(name="untitled",debug=false){const{isQX,isLoon,isSurge,isScriptable,isNode,isShadowrocket,isStash,isJSBox}=ENV();return new(class{constructor(name,debug){this.name=name;this.debug=debug;this.http=HTTP();this.env=ENV();this.node=(()=>{if(isNode){const fs=require("fs");return{fs}}else{return null}})();this.initCache();const delay=(t,v)=>new Promise(function(resolve){setTimeout(resolve.bind(null,v),t)});Promise.prototype.delay=function(t){return this.then(function(v){return delay(t,v)})}}initCache(){if(isQX)this.cache=JSON.parse($prefs.valueForKey(this.name)||"{}");if(isLoon||isSurge||isStash||isShadowrocket)this.cache=JSON.parse($persistentStore.read(this.name)||"{}");if(isNode){let fpath="root.json";if(!this.node.fs.existsSync(fpath)){this.node.fs.writeFileSync(fpath,JSON.stringify({}),{flag:"wx"},(err)=>console.log(err))}this.root={};fpath=`${this.name}.json`;if(!this.node.fs.existsSync(fpath)){this.node.fs.writeFileSync(fpath,JSON.stringify({}),{flag:"wx"},(err)=>console.log(err));this.cache={}}else{this.cache=JSON.parse(this.node.fs.readFileSync(`${this.name}.json`))}}}persistCache(){const data=JSON.stringify(this.cache,null,2);if(isQX)$prefs.setValueForKey(data,this.name);if(isLoon||isSurge||isStash||isShadowrocket)$persistentStore.write(data,this.name);if(isNode){this.node.fs.writeFileSync(`${this.name}.json`,data,{flag:"w"},(err)=>console.log(err));this.node.fs.writeFileSync("root.json",JSON.stringify(this.root,null,2),{flag:"w"},(err)=>console.log(err))}}write(data,key){this.log(`SET ${key}`);if(key.indexOf("#")!==-1){key=key.substr(1);if(isLoon||isSurge||isStash||isShadowrocket){return $persistentStore.write(data,key)}if(isQX){return $prefs.setValueForKey(data,key)}if(isNode){this.root[key]=data}}else{this.cache[key]=data}this.persistCache()}read(key){this.log(`READ ${key}`);if(key.indexOf("#")!==-1){key=key.substr(1);if(isLoon||isSurge||isStash||isShadowrocket){return $persistentStore.read(key)}if(isQX){return $prefs.valueForKey(key)}if(isNode){return this.root[key]}}else{return this.cache[key]}}delete(key){this.log(`DELETE ${key}`);if(key.indexOf("#")!==-1){key=key.substr(1);if(isLoon||isSurge||isStash||isShadowrocket){return $persistentStore.write(null,key)}if(isQX){return $prefs.removeValueForKey(key)}if(isNode){delete this.root[key]}}else{delete this.cache[key]}this.persistCache()}notify(title,subtitle="",content="",options={}){const openURL=options["open-url"];const mediaURL=options["media-url"];if(isQX)$notify(title,subtitle,content,options);if(isSurge){$notification.post(title,subtitle,content+`${mediaURL?"\n多媒体:"+mediaURL:""}`,{url:openURL})}if(isLoon||isStash||isShadowrocket){let opts={};if(openURL)opts["openUrl"]=openURL;if(mediaURL)opts["mediaUrl"]=mediaURL;if(JSON.stringify(opts)==="{}"){$notification.post(title,subtitle,content)}else{$notification.post(title,subtitle,content,opts)}}if(isNode||isScriptable){const content_=content+(openURL?`\n点击跳转:${openURL}`:"")+(mediaURL?`\n多媒体:${mediaURL}`:"");if(isJSBox){const push=require("push");push.schedule({title:title,body:(subtitle?subtitle+"\n":"")+content_,})}else{console.log(`${title}\n${subtitle}\n${content_}\n\n`)}}}log(msg){if(this.debug)console.log(`[${this.name}]LOG:${this.stringify(msg)}`)}info(msg){console.log(`[${this.name}]INFO:${this.stringify(msg)}`)}error(msg){console.log(`[${this.name}]ERROR:${this.stringify(msg)}`)}wait(millisec){return new Promise((resolve)=>setTimeout(resolve,millisec))}done(value={}){if(isQX||isLoon||isSurge||isStash||isShadowrocket){$done(value)}else if(isNode&&!isJSBox){if(typeof $context!=="undefined"){$context.headers=value.headers;$context.statusCode=value.statusCode;$context.body=value.body}}}stringify(obj_or_str){if(typeof obj_or_str==="string"||obj_or_str instanceof String)return obj_or_str;else try{return JSON.stringify(obj_or_str,null,2)}catch(err){return"[object Object]"}}})(name,debug)}
