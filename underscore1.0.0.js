(function( root ) {
  var push = Array.prototype.push;  // 减少原型链查询
  var nativeKeys = Object.keys;  // 获取对象键名

  
  // 不管是直接调用underscore，还是new Underscore, 都返回的是实例对象
  var _ = function (obj) {  // underscore函数对象
    if( !(this instanceof _)) {  // 判断实例是否存在，否则会死循环
      return new _(obj);
    }
    this.wrap = obj;
  }

  // commonjs 规范
  typeof module !== "undefined" && module.exports ?  module.exports = _ : root._ = _;
  // AMD规范 requirejs
  if( typeof define === "function" && define.amd ) {
    define( "underscore", [], function() {
      return {
        _ : _
      }
    })
  }
  // 数组去重
  _.uniq = function( target, callback) {
    var result = [];
    for (var i = 0; i < target.length; i++) {
      var computed = callback ? callback(target[i]) : target[i];
      if(result.indexOf(computed) === -1) {  // indexOf可以检索数组的值
        result.push( computed );
      }
    }
    return result;
  }

  _.restArgs = function( fn ) {
    return function() {  // 返回匿名函数
      var argsLen = fn.length;
      var startIndex = argsLen -1;   // 获取rest位置
      var args = Array(argsLen);  // 存储参数
      var rest = Array.prototype.slice.call( arguments, startIndex);
      for (var i = 0; i < startIndex; i++) {  // rest之前的放args前面
        args[i] = arguments[i];        
      }
      args[startIndex] = rest;
      return fn.apply(this, args);  // this => window
    }
  }

  // 获取对象的函数名
  _.functions = function ( obj ) {
    var result = [];
    var key;
    for (key in obj) {
      result.push(key);
    }
    return result;
  }

  _.isArray = function (obj) {
    return toString.call(obj) === "[object Array]";
  }

  // 遍历对象或数组
  _.each = function (target, callback) {
    var i, key;
    if(_.isArray(target)) { // 数组
      for (i = 0; i < target.length; i++) {
        callback.call(target, target[i], i); // 值 下标        
      }
    } else {  // 对象
      for (key in target) {
        callback.call(target, key, target[key]);  // 属性  值
      }
    }
  }

  // 基本类型检测 isArray在_.each的时候还没有，需要单独写
  _.each(["Function", "String", "Object", "Number"], function( name ) {
    _["is" + name] = function( obj ) {
      return toString.call(obj) === "[object " + name + "]";
    }
  })

  // 链式调用终止，直接返回处理后的数据
  _.prototype.value = function() {
    return this.wrap;
  }

  // 支持链式调用
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  }

  _.map = function(obj, iteratee, context) {
    var iteratee = cb(iteratee, context);  // 生成不同功能的迭代器，最终返回的是一个函数
    var keys = !_.isArray(obj) && _.keys(obj);  // 不是数组的情况用_.keys处理为数组
    var length = (keys || obj).length;  //是数组,keys就是false
    var result = Array(length);  // 通过result重新搜集处理完成的数据
    // 下面的keys是个数组了
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] :index;
      result[index] = iteratee( obj[currentKey] , index, obj); //iteratee是map中传过来的回调
    }
    return result;
  }

  var hasEnumBug = !{valueOf: null}.propertyIsEnumerable("valueOf"); // valueOf是否可枚举
  var noEnumProps = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];

  // 如果发现内置构造函数的方法和自定义的不相同，说明被重写了
  function collect () {
    var nElen = noEnumProps.length,
        constructor = obj.constructor,
        proto = constructor.prototype || ObjProto;
        while ( nElen-- ) {
          var key = noEnumProps[nElen];
          if(key in obj && obj[key] !== proto[key]) { // 自定义对象有内置构造函数原型上不可枚举属性 && 不相等，说明被重写了
            keys.push(key);
          }
        }
  }

  _.keys = function(obj) {
    if( !_.isObject(obj)) { return []; } // 不是对象直接返回空数组
    if( nativeKeys ) { return nativeKeys(obj); }  // es5的API，判断是否支持‘
    // 不支持，需要使用for in遍历
    var keys = [];
    for (var key in object) { // 1. 无法搜集内置构造函数原型上不可枚举属性
      keys.push(key);
    }
    // IE9兼容问题  
    // 重写了内置构造函数原型上的方法(如var obj = {valueOf: "alan"})，IE依旧会认为是不可能枚举属性，因此for in无法遍历出来
    if( hasEnumBug ) { collect( obj, keys ); }  // 2. 搜集内置构造函数原型上不可枚举属性
    return keys;
  }

  _.identity = function(value) {
    return value;
  }

  

  var cb = function(iteratee, context, args) { // args给switch功能判断使用，默认是3
    if(iteratee == null) {  // 如果迭代器不存在，迭代器直接返回数据源(重新组装), 迭代器还是一个函数
      return _.identity;
    }
    if( _.isFunction(iteratee) ) {
      return optimizeCb( iteratee, context, args); // 最终还是会返回函数，里面是指优化了函数
    }

  }

  var optimizeCb = function(func, context, args) {
    if( context === void 0 ) { return func; } // void 0, 函数执行的结果，是真正的undefined
    switch ( args == null ? 3 : args) {
      case 1:
        return function(value) {
          func.call(context, value)
        }
      case 3:
        return function( value, index, obj) { // 这里把传过来的迭代器模式固定了
          return func.call( context, value, index, obj);  // 最终调用的还是用户自定义的处理函数，，改变了函数内部this的指向
        }
      case 4:
        return function( memo, value, key, obj ) {
          return func.call(context, memo, value, key, obj);
        }
    }
  }

  // 类似循环调用
  _.times = function(n, iteratee, context) {
    var result = Array(Math.max(0, n));   // 处理传入值为负数情况
    iteratee = optimizeCb( iteratee, context, 1);  // 优化迭代器
    for (var i = 0; i < n; i++) {
      result[i] = iteratee( i );
    }
    return result;
  }

  var createReduce = function( dir ) {  // 执行顺序， 1 从左到右  -1 从右到左
    // 递归， 累加
    var reduce = function(obj, iteratee, memo, init) {
      var keys = !_.isArray(obj) && _.keys(obj), 
      length = (keys || obj).length;  // 肯定是个数组
      index = dir > 0 ? 0 : length-1;  // 确定累加方向,大于0从左到右，小于0，从右到左,后面的循环会用到
      if(!init) {  // 判断是否传了累加初始值过来,没传取第一项
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      // 同时处理从左到右和从右到左，累加在这里实现
      for (; index >=0 && index < length; index+=dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo , obj[currentKey], currentKey, obj);   // 累加在这里实现，memo存储累加的值
      }
      return memo;
    }
    return function(obj, iteratee, memo, context) { // memo 初始值
      var init = arguments.length >= 3;
      return reduce( obj, optimizeCb(iteratee, context, 4), memo, init); // 第二个参数是包装了一层，后面通过循环调用
    } 
  }

  _.reduce = createReduce( 1 );

  // 链式调用辅助函数
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  }

  // 字符串逃逸
  var escapeMap = {   
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&#39;"
  }

  // 字符串反转
  _.invert = function(obj) {
    var result = {};  // 搜集反转后的值
    var keys = _.keys(obj);   // 获取所有key值
    for (var i = 0; i < keys.length; i++) {
      result[obj[keys[i]]] = keys[i];   // key=>value反转      
    }
    return result;
  }

  var unescapeMap = _.invert(escapeMap);

  var createEscaper = function(map) {
    var escaper = function(match) {
      console.log(match)
      return map[match]
    }
    var exp = '(?:' + _.keys(map).join('|') + ')';  // 匹配需要逃逸的字符串
    var testExp = new RegExp(exp);
    var replaceRegexp = new RegExp(exp, "g");
    return function( str ) {
      str = str == null ? '' : '' + str;
      return testExp.test(str) ? str.replace(replaceRegexp, escaper) : str;
    }
  }

  _.escape = createEscaper(escapeMap); // 字符串逃逸

  _.unescape = createEscaper(unescapeMap);  // 字符串反逃逸

  _.templateSettings = {
    evalute: /<%([\s\S]+?)%>/g,  // js逻辑代码
    interpolate: /<%=([\s\S]+?)%>/g, // 设置变量
    escape: /<%-([\s\S]+?)%>/g    // 字符串逃逸
  }
  // 特殊字符转义对象
  var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;  // 换行，回车等

  var escapeChar = function( match ) {
    return '\\' + escapes[match];
  }

  _.extend = function() {
    var target = arguments[0],
    i = 1,
    length = arguments.length,
    option,
    key;
    if(typeof target !== "object") {
      target = {};
    }
    for (; i < length; i++) {
      if((option = arguments[i]) != null) {
        for (key in option) {
          target[key] = option[key];
        }
      }
    }
    return target
  }

  // 模板引擎 ， 第二个参数支持配置variable属性，提升性能(不使用new Function)
  _.template = function(text, settings) {
    // settings = _.templateSettings;
    settings = _.extend({}, settings, _.templateSettings)
    var matcher = RegExp([  // 用"|"合并这个节正则
      settings.escape.source,
      settings.interpolate.source,
      settings.evalute.source
    ].join("|"), "g");
    var index = 0;
    //保存函数体内部要执行的主题内容
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      // 开始位置index到当前匹配文本位置 && 换行回车等字符转义
      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);  
      index = offset + match.length;
      if(escape) {  // 匹配需要转义字符串
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";  // 用_.escape处理下转义字符串
      } else if( interpolate ) { // 插入变量
        source += "'+\n((__t=("+interpolate+")) ==null?'':__t)+\n'";  // 
      } else if(evaluate) { // js逻辑处理
        source += "';\n" + evaluate + "\n__p+='";
      }
      return match;
    });

    source +="';\n";
    if(!settings.variable)source='with(obj||{}){\n'+source+'}\n';  // with限定作用域
    source = "var __t,__p='';" + source + "return __p;\n";
    // new Function ([arg1[, arg2[, ...argN]],] functionBody)
    var render = new Function(settings.variable || "obj", "_", source);  // obj是传入的对象，_是underscore， 最后一个参数是函数执行体
    var template = function(data) {
      return render.call(this, data, _);
    }
    return template;
  }

  // 获取随机数
  _.random = function(min, max) {
    if( max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random()*(max-min+1));  // floor向下取整
  }

  // 获取对象的所有value值
  _.values = function(obj) {
    var keys = _.keys(obj),
    length = keys.length,
    values = Array(length),
    i;
    for (i = 0; i < length; i++) {
      values[i] = obj[keys[i]];      
    }
    return values;
  }

  // 乱序, 用两个数想比较简单 obj = [1,2]
  _.shuffle = function(obj) {
    var set = _.isArray(obj) ? obj : _.values(obj),  // 对象用的是value值乱序
    length = set.length,
    shuffle = Array(length),
    index, rand;
    for (index = 0; index < length; index++) {
      rand = _.random(0, index);
      // console.log(rand);     // 00000
      // 极端情况5个0，00000， 虽然rand和index会相同，但362行rand会被重写，保证不会跟当前的index相同
      // rand能赋值给不同的index， rand同时能接收到set的所有值，所以rand能踩中所有的下标值
      shuffle[index] = shuffle[rand];  //index和rand互换，把索引打乱 [1,5,2,3,4,]
      shuffle[rand]  = set[index];    // 怎么保证rand能踩中所有的下标值呢  
    }
    return shuffle;
  }

  // 数组截取
  _.sample = function(obj, n) {
    if( n == null ) {
      if(!_.isArray(obj)) {
        obj = _.values(obj);
      }
      return obj[_.random(obj.length-1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  }

  // 获取时间戳
  _.now = Date.now || function(){
    return new Date().getTime();
  }
  // 防抖  执行事件后等wait时间后触发处理函数
  _.debounce = function(func, wait, n) {
    var args, timeout, time;  // timeout是存储setTimeout的引用
    var later = function() {
      var last = _.now() - time;  // 现在时间-上次执行时间
      if(last < wait) {  // 时间间隔小于wait，还没到执行的时候，感觉永远都不会执行这里
        // timeout = setTimeout(later, wait - last);
      } else {  // 超过wait时间，可以执行了
        timeout = null;
        if(!n) {  
          func.apply(this, args);
        }
      }
    }
    return function() {
      args = arguments;
      time = _.now();  // 调用时的时间戳
      var callNow = n && !timeout;   // 是否立即调用
      if(!timeout) { // 定时器不存在的情况(可能是首次，也可能已经执行过了)，才会重新设置定时器
        setTimeout(later, wait);   // 设置定时器
      }
      if(callNow) { // 立即调用
        func.apply(this, arguments);
      }
    }
  }

  // 节流  自动读秒
  _.throttle = function(func, wait, options) {
    var context, args, result, previous = 0;
    var timeout = null;
    if(!options) {
      options = {};
    }

    var later = function() {  // 执行体
      previous = _.now();
      timeout = null;
      result = func.apply(context, args);
      if(!timeout) {
        context = args = null;
      }
    }

    return function() {
      args = arguments;
      var now = _.now();
      // console.log(wait, now, previous)
      var remaining = wait - (now - previous);  // 距离下次触发的时间
      if(remaining <=0) { // 可以触发下次事件了
        if(timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;  // 重置上次执行时间
        result = func.apply(context, args); // 立即执行回调
      } else if(!timeout) {
        context = args = null;
        // console.log(remaining) 
        timeout = setTimeout(later, remaining);
      } 
      return result;
    }
  }

  // underscore工具方法支持函数调用和实例对象调用
  // _.minxin把所有函数对象都挂在到实例原型上
  _.mixin = function( obj ) {  // obj就是underscore函数对象
    _.each(_.functions( obj ), function (name, value) {
      var func = obj[name];  
      _.prototype[name] = function() {  // 把方法加入到实例原型上
        var args = [ this.wrap ];  // 每次只要调用underscore都是最新处理后的数据
        push.apply( args, arguments );  // 数组合并  [目标源, 回调函数]
        return result(this, func.apply( this, args ));  // 第一个参数都是数据源
      }
    })
  }
  _.mixin( _ );

  root._ = _;
})( this );