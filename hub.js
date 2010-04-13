/*!
  hub.js -- cloud-friendly object graph sync
  ©2010 Erich Atlas Ocean. Licensed under an MIT license:
  
  Permission is hereby granted, free of charge, to any person obtaining a 
  copy of this software and associated documentation files (the "Software"), 
  to deal in the Software without restriction, including without limitation 
  the rights to use, copy, modify, merge, publish, distribute, sublicense, 
  and/or sell copies of the Software, and to permit persons to whom the 
  Software is furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in 
  all copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
  DEALINGS IN THE SOFTWARE.
  
  This software includes substantial portions from SproutCore:
    
    SproutCore -- JavaScript Application Framework
    copyright 2006-2008, Sprout Systems, Inc. and contributors.
    
    Permission is hereby granted, free of charge, to any person obtaining a 
    copy of this software and associated documentation files (the "Software"), 
    to deal in the Software without restriction, including without limitation 
    the rights to use, copy, modify, merge, publish, distribute, sublicense, 
    and/or sell copies of the Software, and to permit persons to whom the 
    Software is furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in 
    all copies or substantial portions of the Software.
    
  hub.uuid() function Copyright (c) 2009 Robert Kieffer.
  Dual licensed under the MIT and GPL licenses.
  
  hub.SHA256() function based on original code by Angel Marin, Paul Johnston.
*/

// NOTE: The "/*!" syntax above allows the comment to pass through the YUI 
// compressor unchanged, so that it will remain in the final minified output.
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global window GLOBAL exports require */

/**
  hub.js exports exactly one global: hub.  All hub methods and functions are 
  defined inside of this namespace.  Don't add new properties to this namespace 
  as it could confict with future versions of hub.js.
  
  In addition to the `hub` global, private properties and methods within the 
  hub namespace are prefixed with _hub_ and are reserved for use by hub.js. 
  Private properties and methods are not guaranteed to exist or have the same 
  meaning, signature or types from release to release.
  
  @namespace
*/
var hub ;

// Handle env differences when hub.js is running on node.js vs. in the browser.
if (typeof window === 'undefined') {
  if (typeof exports === 'object') {
    // We're running on node.js.
    hub = exports ;
    hub.isNode = true ;
    hub.root = GLOBAL ;
    var sys = require("sys") ;
    hub.debug = function(type, what) {
      if (typeof what === 'undefined') { what = type; type = 'LOG'; }
      sys.puts(type + ": " + sys.inspect(what)) ;
    };
  } else {
    // We're running on an unknown system.
    throw "hub.js currently requires node.js when run outside the browser" ;
  }
} else {
  // We're running in a web browser.
  hub = {
    isNode: false,
    root: window,
    debug: function(type, what) {
      if (typeof what === 'undefined') { what = type; type = 'LOG'; }
      console.log(type + ": ") ;
      console.log(what) ; // Doing `what` separately prints out the structure.
    }
  };
  
  // Prevent a console.log from blowing things up if we are on a browser that
  // does not support it.
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }
}
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================

// NOTE: All calls to these functions are stripped from production builds.

var hub_assert = function(test, msg) {
  if (!test) {
    if (!msg) try { throw new Error() } catch(e) { if (e.stack) msg = e.stack }
    throw ("HUB_ASSERT: " + msg) ;
  }
};

var hub_precondition = function(test, msg) {  
  if (!test) {
    if (!msg) try { throw new Error() } catch(e) { if (e.stack) msg = e.stack }
    throw ("HUB_PRECONDITION: " + msg) ;
  }
};

var hub_postcondition = function(test, msg) {
  if (!test) { 
    if (!msg) try { throw new Error() } catch(e) { if (e.stack) msg = e.stack }   
    throw ("HUB_POSTCONDITION: " + msg) ;
  }
};
var hub_invariant = function(test, msg) {
  if (!test) {
    if (!msg) try { throw new Error() } catch(e) { if (e.stack) msg = e.stack }
    throw ("HUB_INVARIANT: " + msg) ;
  }
};

var hub_error = function(msg) {
  // Raise unconditionally.
  if (!msg) try { throw new Error() } catch(e) { if (e.stack) msg = e.stack }
  throw "HUB_ERROR: " + msg ;
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/* This test always happens, even in production builds.
  
  NOTE: `hub.allege()`, not `hub_allege()`. (We don't want to pollute the 
  global namespace in production code.)
  
  @static
*/
hub.allege = function(test, msg) {
  if (!test) throw "HUB_ALLEGE: " + msg ;
};

/**
  Adds properties to a target object.
  
  Takes the root object and adds the attributes for any additional 
  arguments passed.
  
  @param target {Object} the target object to extend
  @param properties {Object} one or more objects with properties to copy.
  @returns {Object} the target object.
  @static
*/
hub.mixin = function() {
  // copy reference to target object
  var target = arguments[0] || {},
      idx = 1,
      len = arguments.length,
      options, key;

  // Handle case where we have only one item...extend hub
  if (len===1) {
    target = this || {} ;
    idx = 0 ;
  }

  for (; idx<len; ++idx) {
    if (!(options = arguments[idx])) continue ;
    for(key in options) {
      if (!options.hasOwnProperty(key)) continue ;
      var copy = options[key] ;
      if (target===copy) continue ; // prevent never-ending loop
      if (copy !== undefined) target[key] = copy ;
    }
  }

  return target ;
};

/**
  Adds properties to a target object.  Unlike hub.mixin, however, if the target
  already has a value for a property, it will not be overwritten.
  
  Takes the root object and adds the attributes for any additional 
  arguments passed.
  
  TODO: Merge this implementation with hub.mixin(); the code is almost 
  identical.
  
  @param target {Object} the target object to extend
  @param properties {Object} one or more objects with properties to copy.
  @returns {Object} the target object.
  @static
*/
hub.supplement = function() {
  // copy reference to target object
  var target = arguments[0] || {};
  var idx = 1;
  var length = arguments.length ;
  var options ;

  // Handle case where we have only one item...extend hub
  if (length === 1) {
    target = this || {};
    idx=0;
  }

  for ( ; idx < length; idx++ ) {
    if (!(options = arguments[idx])) continue ;
    for(var key in options) {
      if (!options.hasOwnProperty(key)) continue ;
      var src = target[key] ;
      var copy = options[key] ;
      if (target===copy) continue ; // prevent never-ending loop
      if (copy !== undefined  &&  src === undefined) target[key] = copy ;
    }
  }
  
  return target;
} ;

/** 
  Alternative to mixin.  Provided for compatibility with jQuery.
  @function 
*/
hub.extend = hub.mixin ;

// ..........................................................
// CORE FUNCTIONS
// 
// Enough with the bootstrap code.  Let's define some core functions.

hub.mixin(/** @scope hub */ {
  
  // ........................................
  // GLOBAL CONSTANTS
  // 
  T_ERROR:     'error',
  T_OBJECT:    'object',
  T_NULL:      'null',
  T_CLASS:     'class',
  T_HASH:      'hash',
  T_FUNCTION:  'function',
  T_UNDEFINED: 'undefined',
  T_NUMBER:    'number',
  T_BOOL:      'boolean',
  T_ARRAY:     'array',
  T_STRING:    'string',
  
  // ........................................
  // TYPING & ARRAY MESSAGING
  //   

  /**
    Returns a consistant type for the passed item.

    Use this instead of the built-in typeOf() to get the type of an item. 
    It will return the same result across all browsers and includes a bit 
    more detail.  Here is what will be returned:

    | Return Value Constant | Meaning |
    | hub.T_STRING | String primitive |
    | hub.T_NUMBER | Number primitive |
    | hub.T_BOOLEAN | Boolean primitive |
    | hub.T_NULL | Null value |
    | hub.T_UNDEFINED | Undefined value |
    | hub.T_FUNCTION | A function |
    | hub.T_ARRAY | An instance of Array |
    | hub.T_CLASS | A hub.js class (created using hub.Object.extend()) |
    | hub.T_OBJECT | A hub.js object instance |
    | hub.T_HASH | A JavaScript object not inheriting from hub.Object |

    @param item {Object} the item to check
    @returns {String} the type
  */  
  typeOf: function(item) {
    if (item === undefined) return hub.T_UNDEFINED ;
    if (item === null) return hub.T_NULL ; 
    var ret = typeof(item) ;
    if (ret == "object") {
      if (item instanceof Array) {
        ret = hub.T_ARRAY ;
      } else if (item instanceof Function) {
        ret = item.isClass ? hub.T_CLASS : hub.T_FUNCTION ;

      // NB: typeOf() may be called before hub.Error has had a chance to load
      // so this code checks for the presence of hub.Error first just to make
      // sure.  No error instance can exist before the class loads anyway so
      // this is safe.
      } else if (hub.Error && (item instanceof hub.Error)) {
        ret = hub.T_ERROR ;        
      } else if (item.isObject === true) {
        ret = hub.T_OBJECT ;
      } else ret = hub.T_HASH ;
    } else if (ret === hub.T_FUNCTION) ret = (item.isClass) ? hub.T_CLASS : hub.T_FUNCTION;
    return ret ;
  },

  /**
    Returns true if the passed value is null or undefined.  This avoids errors
    from JSLint complaining about use of ==, which can be technically 
    confusing.
    
    @param {Object} obj value to test
    @returns {Boolean}
  */
  none: function(obj) {
    return obj===null || obj===undefined;  
  },

  /**
    Verifies that a value is either null or an empty string.  Return false if
    the object is not a string.
    
    @param {Object} obj value to test
    @returns {Boolean}
  */
  empty: function(obj) {
    return obj===null || obj===undefined || obj==='';
  },
  
  /**
    Returns true if the passed object is an array or array-like. Instances
    of the NodeList class return false.

    Unlike hub.typeOf this method returns true even if the passed object is 
    not formally array but appears to be array-like (i.e. has a length 
    property, responds to .objectAt, etc.)

    @param obj {Object} the object to test
    @returns {Boolean} 
  */
  isArray: function(obj) {
    if (obj && obj.objectAt) return true ; // fast path

    var len = (obj ? obj.length : null), type = hub.typeOf(obj);
    return !(hub.none(len) || (type === hub.T_FUNCTION) || (type === hub.T_STRING) || obj.setInterval) ;
  },

  /**
    Makes an object into an Array if it is not array or array-like already.
    Unlike hub.A(), this method will not clone the object if it is already
    an array.
    
    @param {Object} obj object to convert
    @returns {Array} Actual array
  */
  makeArray: function(obj) {
    return hub.isArray(obj) ? obj : hub.A(obj);
  },
  
  /**
    Converts the passed object to an Array.  If the object appears to be 
    array-like, a new array will be cloned from it.  Otherwise, a new array
    will be created with the item itself as the only item in the array.
    
    @param object {Object} any enumerable or array-like object.
    @returns {Array} Array of items
  */
  A: function(obj) {
    // null or undefined -- fast path
    if (hub.none(obj)) return [] ;
    
    // primitive -- fast path
    if (obj.slice instanceof Function) {
      // do we have a string?
      if (typeof(obj) === 'string') return [obj] ;
      else return obj.slice() ;
    }
    
    // enumerable -- fast path
    if (obj.toArray) return obj.toArray() ;
    
    // if not array-like, then just wrap in array.
    if (!hub.isArray(obj)) return [obj];
    
    // when all else fails, do a manual convert...
    var ret = [], len = obj.length;
    while(--len >= 0) ret[len] = obj[len];
    return ret ;
  },
  
  // ..........................................................
  // GUIDS & HASHES
  // 
  
  guidKey: "_hub_guid_" + new Date().getTime(),

  // Used for guid generation...
  _hub_nextGUID: 0, _hub_numberGuids: [], _hub_stringGuids: {}, _hub_keyCache: {},

  /**
    Returns a unique GUID for the object.  If the object does not yet have
    a guid, one will be assigned to it.  You can call this on any object,
    hub.Object-based or not, but be aware that it will add a _guid property.

    You can also use this method on DOM Element objects.

    @param obj {Object} any object, string, number, Element, or primitive
    @returns {String} the unique guid for this instance.
  */
  guidFor: function(obj) {
    
    // special cases where we don't want to add a key to object
    if (obj === undefined) return "(undefined)" ;
    if (obj === null) return '(null)' ;
    if (obj === Object) return '(Object)';
    if (obj === Array) return '(Array)';
    
    var guidKey = this.guidKey ;
    if (obj[guidKey]) return obj[guidKey] ;

    switch(typeof obj) {
      case hub.T_NUMBER:
        return (this._hub_numberGuids[obj] = this._hub_numberGuids[obj] || ("nu" + obj));
      case hub.T_STRING:
        return (this._hub_stringGuids[obj] = this._hub_stringGuids[obj] || ("st" + obj));
      case hub.T_BOOL:
        return (obj) ? "(true)" : "(false)" ;
      default:
        return hub.generateGuid(obj);
    }
  },

  /**
    Returns a key name that combines the named key + prefix.  This is more 
    efficient than simply combining strings because it uses a cache  
    internally for performance.
    
    @param {String} prefix the prefix to attach to the key
    @param {String} key key
    @returns {String} result 
  */
  keyFor: function(prefix, key) {
    var ret, pcache = this._hub_keyCache[prefix];
    if (!pcache) pcache = this._hub_keyCache[prefix] = {}; // get cache for prefix
    ret = pcache[key];
    if (!ret) ret = pcache[key] = prefix + '_' + key ;
    return ret ;
  },

  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in.  You will rarely need to use this method.  Instead you should
    call hub.guidFor(obj), which return an existing guid if available.

    @param {Object} obj the object to assign the guid to
    @returns {String} the guid
  */
  generateGuid: function(obj) { 
    var ret = ("hub" + (this._hub_nextGUID++)); 
    if (obj) obj[this.guidKey] = ret ;
    return ret ;
  },

  /**
    Returns a unique hash code for the object.  If the object implements
    a hash() method, the value of that method will be returned.  Otherwise,
    this will return the same value as guidFor().  

    Unlike guidFor(), this method allows you to implement logic in your 
    code to cause two separate instances of the same object to be treated as
    if they were equal for comparisons and other functions.

    IMPORTANT:  If you implement a hash() method, it MUST NOT return a 
    number or a string that contains only a number.  Typically hash codes 
    are strings that begin with a "%".

    @param obj {Object} the object
    @returns {String} the hash code for this instance.
  */
  hashFor: function(obj) {
    return (obj && obj.hash && (typeof obj.hash === hub.T_FUNCTION)) ? obj.hash() : this.guidFor(obj) ;
  },
    
  /**
    This will compare the two object values using their hash codes.

    @param a {Object} first value to compare
    @param b {Object} the second value to compare
    @returns {Boolean} true if the two have equal hash code values.

  */
  isEqual: function(a,b) {
    // shortcut a few places.
    if (a === null) {
      return b === null ;
    } else if (a === undefined) {
      return b === undefined ;

    // finally, check their hash-codes
    } else return this.hashFor(a) === this.hashFor(b) ;
  },
  
  
  /**
   This will compare two javascript values of possibly different types.
   It will tell you which one is greater than the other by returning
   -1 if the first is smaller than the second,
    0 if both are equal,
    1 if the first is greater than the second.
  
   The order is calculated based on hub.ORDER_DEFINITION , if types are different.
   In case they have the same type an appropriate comparison for this type is made.

   @param v {Object} first value to compare
   @param w {Object} the second value to compare
   @returns {NUMBER} -1 if v < w, 0 if v = w and 1 if v > w.

  */
  compare: function (v, w) {
    var type1 = hub.typeOf(v);
    var type2 = hub.typeOf(w);
    var type1Index = hub.ORDER_DEFINITION.indexOf(type1);
    var type2Index = hub.ORDER_DEFINITION.indexOf(type2);
    
    if (type1Index < type2Index) return -1;
    if (type1Index > type2Index) return 1;
    
    // ok - types are equal - so we have to check values now
    switch (type1) {
      case hub.T_BOOL:
      case hub.T_NUMBER:
        if (v<w) return -1;
        if (v>w) return 1;
        return 0;

      case hub.T_STRING:
        if (v.localeCompare(w)<0) return -1;
        if (v.localeCompare(w)>0) return 1;
        return 0;

      case hub.T_ARRAY:
        var l = Math.min(v.length,w.length);
        var r = 0;
        var i = 0;
        while (r===0 && i < l) {
          r = arguments.callee(v[i],w[i]);
          if ( r !== 0 ) return r;
          i++;
        }
      
        // all elements are equal now
        // shorter array should be ordered first
        if (v.length < w.length) return -1;
        if (v.length > w.length) return 1;
        // arrays are equal now
        return 0;
        
      case hub.T_OBJECT:
        if (typeof v.constructor.compare === 'function') return v.constructor.compare(v, w);
        return 0;

      default:
        return 0;
    }
  },
  
  // ..........................................................
  // OBJECT MANAGEMENT
  // 
  
  /** 
    Empty function.  Useful for some operations. 
    
    @returns {Object}
  */
  K: function() { return this; },

  /** 
    Empty array.  Useful for some optimizations.
  
    @property {Array}
  */
  EMPTY_ARRAY: [],

  /**
    Empty hash.  Useful for some optimizations.
  
    @property {Hash}
  */
  EMPTY_HASH: {},

  /**
    Empty range. Useful for some optimizations.
    
    @property {Range}
  */
  EMPTY_RANGE: {start: 0, length: 0},
  
  /**
    Creates a new object with the passed object as its prototype.

    This method uses JavaScript's native inheritence method to create a new 
    object.    

    You cannot use beget() to create new hub.Object-based objects, but you
    can use it to beget Arrays, Hashes, Sets and objects you build yourself.
    Note that when you beget() a new object, this method will also call the
    didBeget() method on the object you passed in if it is defined.  You can
    use this method to perform any other setup needed.

    In general, you will not use beget() often as hub.Object is much more 
    useful, but for certain rare algorithms, this method can be very useful.

    For more information on using beget(), see the section on beget() in 
    Crockford's JavaScript: The Good Parts.

    @param obj {Object} the object to beget
    @returns {Object} the new object.
  */
  beget: function(obj) {
    if (hub.none(obj)) return null ;
    var K = hub.K; K.prototype = obj ;
    var ret = new K();
    K.prototype = null ; // avoid leaks
    if (hub.typeOf(obj.didBeget) === hub.T_FUNCTION) ret = obj.didBeget(ret); 
    return ret ;
  },

  /**
    Creates a clone of the passed object.  This function can take just about
    any type of object and create a clone of it, including primitive values
    (which are not actually cloned because they are immutable).

    If the passed object implements the clone() method, then this function
    will simply call that method and return the result.

    @param object {Object} the object to clone
    @returns {Object} the cloned object
  */
  copy: function(object) {
    var ret = object ;
    
    // fast path
    if (object && object.isCopyable) return object.copy();
    
    switch (hub.typeOf(object)) {
    case hub.T_ARRAY:
      if (object.clone && hub.typeOf(object.clone) === hub.T_FUNCTION) {
        ret = object.clone() ;
      } else ret = object.slice() ;
      break ;

    case hub.T_HASH:
    case hub.T_OBJECT:
      if (object.clone && hub.typeOf(object.clone) === hub.T_FUNCTION) {
        ret = object.clone() ;
      } else {
        ret = {} ;
        for(var key in object) ret[key] = object[key] ;
      }
    }

    return ret ;
  },

  /**
    Returns a new object combining the values of all passed hashes.

    @param object {Object} one or more objects
    @returns {Object} new Object
  */
  merge: function() {
    var ret = {}, len = arguments.length, idx;
    for(idx=0;idx<len;idx++) hub.mixin(ret, arguments[idx]);
    return ret ;
  },

  /**
    Returns all of the keys defined on an object or hash.  This is useful
    when inspecting objects for debugging.

    @param {Object} obj
    @returns {Array} array of keys
  */
  keys: function(obj) {
    var ret = [];
    for(var key in obj) ret.push(key);
    return ret;
  },

  /**
    Convenience method to inspect an object.  This method will attempt to 
    convert the object into a useful string description.
  */
  inspect: function(obj) {
    var v, ret = [] ;
    for(var key in obj) {
      v = obj[key] ;
      if (v === 'toString') continue ; // ignore useless items
      if (hub.typeOf(v) === hub.T_FUNCTION) v = "function() { ... }" ;
      ret.push(key + ": " + v) ;
    }
    return "{" + ret.join(" , ") + "}" ;
  },

  /**
    Returns a tuple containing the object and key for the specified property 
    path.  If no object could be found to match the property path, then 
    returns null.

    This is the standard method used throughout hub.js to resolve property
    paths.

    @param path {String} the property path
    @param root {Object} optional parameter specifying the place to start
    @returns {Array} array with [object, property] if found or null
  */
  tupleForPropertyPath: function(path, root) {

    // if the passed path is itself a tuple, return it
    if (hub.typeOf(path) === hub.T_ARRAY) return path ;

    // find the key.  It is the last . or first *
    var key ;
    var stopAt = path.indexOf('*') ;
    if (stopAt < 0) stopAt = path.lastIndexOf('.') ;
    key = (stopAt >= 0) ? path.slice(stopAt+1) : path ;

    // convert path to object.
    var obj = this.objectForPropertyPath(path, root, stopAt) ;
    return (obj && key) ? [obj,key] : null ;
  },

  /** 
    Finds the object for the passed path or array of path components.  This is 
    the standard method used in hub.js to traverse object paths.

    @param path {String} the path
    @param root {Object} optional root object.  window is used otherwise
    @param stopAt {Integer} optional point to stop searching the path.
    @returns {Object} the found object or undefined.
  */
  objectForPropertyPath: function(path, root, stopAt) {

    var loc, nextDotAt, key, max ;

    if (!root) root = hub.root ;

    // faster method for strings
    if (hub.typeOf(path) === hub.T_STRING) {
      if (stopAt === undefined) stopAt = path.length ;
      loc = 0 ;
      while((root) && (loc < stopAt)) {
        nextDotAt = path.indexOf('.', loc) ;
        if ((nextDotAt < 0) || (nextDotAt > stopAt)) nextDotAt = stopAt;
        key = path.slice(loc, nextDotAt);
        root = root.get ? root.get(key) : root[key] ;
        loc = nextDotAt+1; 
      }
      if (loc < stopAt) root = undefined; // hit a dead end. :(

    // older method using an array
    } else {

      loc = 0; max = path.length; key = null;
      while((loc < max) && root) {
        key = path[loc++];
        if (key) root = (root.get) ? root.get(key) : root[key] ;
      }
      if (loc < max) root = undefined ;
    }

    return root ;
  },
  
  
  // ..........................................................
  // LOCALIZATION SUPPORT
  // 
  
  /**
    Known loc strings
    
    @property {Hash}
  */
  STRINGS: {},
  
  /**
    This is a simplified handler for installing a bunch of strings.  This
    ignores the language name and simply applies the passed strings hash.
    
    @param {String} lang the language the strings are for
    @param {Hash} strings hash of strings
    @returns {hub} receiver
  */
  stringsFor: function(lang, strings) {
    hub.mixin(hub.STRINGS, strings);
    return this ;
  }
  
  
}); // end mixin

/** @function Alias for hub.copy(). */
hub.clone = hub.copy ;

/** @private Used by hub.compare */
hub.ORDER_DEFINITION = [ hub.T_ERROR,
                         hub.T_UNDEFINED,
                         hub.T_NULL,
                         hub.T_BOOL,
                         hub.T_NUMBER,
                         hub.T_STRING,
                         hub.T_ARRAY,
                         hub.T_HASH,
                         hub.T_OBJECT,
                         hub.T_FUNCTION,
                         hub.T_CLASS ];


// ........................................
// FUNCTION ENHANCEMENTS
//

hub.mixin(Function.prototype, 
/** @lends Function.prototype */ {
  
  /**
    Indicates that the function should be treated as a computed property.
    
    Computed properties are methods that you want to treat as if they were
    static properties.  When you use get() or set() on a computed property,
    the object will call the property method and return its value instead of 
    returning the method itself.  This makes it easy to create "virtual 
    properties" that are computed dynamically from other properties.
    
    Consider the following example:
    
    {{{
      contact = hub.Object.create({

        firstName: "Charles",
        lastName: "Jolley",
        
        // This is a computed property!
        fullName: function() {
          return this.getEach('firstName','lastName').compact().join(' ') ;
        }.property('firstName', 'lastName'),
        
        // this is not
        getFullName: function() {
          return this.getEach('firstName','lastName').compact().join(' ') ;
        }
      });

      contact.get('firstName') ;
      --> "Charles"
      
      contact.get('fullName') ;
      --> "Charles Jolley"
      
      contact.get('getFullName') ;
      --> function()
    }}}
    
    Note that when you get the fullName property, hub.js will call the
    fullName() function and return its value whereas when you get() a property
    that contains a regular method (such as getFullName above), then the 
    function itself will be returned instead.
    
    h2. Using Dependent Keys

    Computed properties are often computed dynamically from other member 
    properties.  Whenever those properties change, you need to notify any
    object that is observing the computed property that the computed property
    has changed also.  We call these properties the computed property is based
    upon "dependent keys".
    
    For example, in the contact object above, the fullName property depends on
    the firstName and lastName property.  If either property value changes,
    any observer watching the fullName property will need to be notified as 
    well.
    
    You inform hub.js of these dependent keys by passing the key names
    as parameters to the property() function.  Whenever the value of any key
    you name here changes, the computed property will be marked as changed
    also.
    
    You should always register dependent keys for computed properties to 
    ensure they update.
    
    h2. Using Computed Properties as Setters
    
    Computed properties can be used to modify the state of an object as well
    as to return a value.  Unlike many other key-value system, you use the 
    same method to both get and set values on a computed property.  To 
    write a setter, simply declare two extra parameters: key and value.
    
    Whenever your property function is called as a setter, the value 
    parameter will be set.  Whenever your property is called as a getter the
    value parameter will be undefined.
    
    For example, the following object will split any full name that you set
    into a first name and last name components and save them.
    
    {{{
      contact = hub.Object.create({
        
        fullName: function(key, value) {
          if (value !== undefined) {
            var parts = value.split(' ') ;
            this.beginPropertyChanges()
              .set('firstName', parts[0])
              .set('lastName', parts[1])
            .endPropertyChanges() ;
          }
          return this.getEach('firstName', 'lastName').compact().join(' ');
        }.property('firstName','lastName')
        
      }) ;
      
    }}}
    
    h2. Why Use The Same Method for Getters and Setters?
    
    Most property-based frameworks expect you to write two methods for each
    property but hub.js only uses one. We do this because most of the time
    when you write a setter is is basically a getter plus some extra work.
    There is little added benefit in writing both methods when you can
    conditionally exclude part of it. This helps to keep your code more
    compact and easier to maintain.
    
    @param dependentKeys {String...} optional set of dependent keys
    @returns {Function} the declared function instance
  */
  property: function() {
    this.dependentKeys = hub.A(arguments) ;
    var guid = hub.guidFor(this) ;
    this.cacheKey = "__hub_cache__" + guid ;
    this.lastSetValueKey = "__hub_lastValue__" + guid ;
    this.isProperty = true ;
    return this ;
  },
  
  /**
    You can call this method on a computed property to indicate that the 
    property is cacheable (or not cacheable).  By default all computed 
    properties are not cached.  Enabling this feature will allow hub.js
    to cache the return value of your computed property and to use that
    value until one of your dependent properties changes or until you 
    invoke propertyDidChange() and name the computed property itself.
    
    If you do not specify this option, computed properties are assumed to be
    not cacheable.
    
    @param {Boolean} aFlag optionally indicate cacheable or no, default true
    @returns {Function} reciever
  */
  cacheable: function(aFlag) {
    this.isProperty = true ;  // also make a property just in case
    if (!this.dependentKeys) this.dependentKeys = [] ;
    this.isCacheable = (aFlag === undefined) ? true : aFlag ;
    return this ;
  },
  
  /**
    Indicates that the computed property is volatile.  Normally hub.js 
    assumes that your computed property is idempotent.  That is, calling 
    set() on your property more than once with the same value has the same
    effect as calling it only once.  
    
    All non-computed properties are idempotent and normally you should make
    your computed properties behave the same way.  However, if you need to
    make your property change its return value everytime your method is
    called, you may chain this to your property to make it volatile.
    
    If you do not specify this option, properties are assumed to be 
    non-volatile. 
    
    @param {Boolean} aFlag optionally indicate state, default to true
    @returns {Function} receiver
  */
  idempotent: function(aFlag) {
    this.isProperty = true;  // also make a property just in case
    if (!this.dependentKeys) this.dependentKeys = [] ;
    this.isVolatile = (aFlag === undefined) ? true : aFlag ;
    return this ;
  },
  
  /**
    Declare that a function should observe an object at the named path.  Note
    that the path is used only to construct the observation one time.
    
    @returns {Function} receiver
  */
  observes: function(propertyPaths) { 
    // sort property paths into local paths (i.e just a property name) and
    // full paths (i.e. those with a . or * in them)
    var loc = arguments.length, local = null, paths = null ;
    while(--loc >= 0) {
      var path = arguments[loc] ;
      // local
      if ((path.indexOf('.')<0) && (path.indexOf('*')<0)) {
        if (!local) local = this.localPropertyPaths = [] ;
        local.push(path);
        
      // regular
      } else {
        if (!paths) paths = this.propertyPaths = [] ;
        paths.push(path) ;
      }
    }
    return this ;
  }
  
});

// ..........................................................
// STRING FUNCTIONS
// 

/**
  Apply formatting options to the string.  This will look for occurrences
  of %@ in your string and substitute them with the arguments you pass into
  this method.  If you want to control the specific order of replacement, 
  you can add a number after the key as well to indicate which argument 
  you want to insert.  

  Ordered insertions are most useful when building loc strings where values
  you need to insert may appear in different orders.

  h3. Examples
  
  {{{
    hub.fmt("Hello %@ %@", 'John', 'Doe') => "Hello John Doe"
    hub.fmt("Hello %@2, %@1", 'John', 'Doe') => "Hello Doe, John"
  }}}
  
  @param str {String, ...} a String followed by optional arguments
  @returns {String} formatted string
*/
hub.fmt = function(str) {
  // first, replace any ORDERED replacements.
  var args = arguments,
      idx  = 1; // the current index for non-numerical replacements
  
  return str.replace(/%@([0-9]+)?/g, function(s, argIndex) {
    argIndex = (argIndex) ? parseInt(argIndex,0)-1 : idx++ ;
    s = args[argIndex];
    return ((s===null) ? '(null)' : (s===undefined) ? '' : s).toString(); 
  }) ;
};

/**
  Splits the string into words, separated by spaces. Empty strings are
  removed from the results.
  
  @returns {Array} an array of non-empty strings
*/
hub.w = function(w) {
  var ary = [], ary2 = w.split(' '), len = ary2.length ;
  for (var idx=0; idx<len; ++idx) {
    var str = ary2[idx] ;
    if (str.length !== 0) ary.push(str) ; // skip empty strings
  }
  return ary ;
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  This private class is used to store information about observers on a 
  particular key.  Note that this object is not observable.  You create new
  instances by calling hub.beget(hub.ObserverSet) ;
  
  @private
*/
hub.ObserverSet = {

  /** The number of targets in the set. */
  targets: 0,
  
  _hub_membersCacheIsValid: false,
  
  /**
    Adds the named target/method observer to the set.  The method must be
    a function, not a string.
  */
  add: function(target, method, context) {
    var targetGuid = (target) ? hub.guidFor(target) : "__this__";
    
    // get the set of methods
    var methods = this[targetGuid] ;
    if (!methods) {
      methods = this[targetGuid] = hub.CoreSet.create() ;
      methods.target = target ;
      methods.isTargetSet = true ; // used for getMembers().
      this.targets++ ;
    }
    methods.add(method) ;
    
    // context is really useful sometimes but not used that often so this
    // implementation is intentionally lazy.
    if (context !== undefined) {
      var contexts = methods.contexts ;
      if (!context) contexts = {};
      contexts[hub.guidFor(method)] = context ;
    }
    
    this._hub_membersCacheIsValid = false ;
  },
  
  /**
    Removes the named target/method observer from the set.  If this is the
    last method for the named target, then the number of targets will also
    be reduced.
  
    returns true if the items was removed, false if it was not found.
  */
  remove: function(target, method) {
    var targetGuid = (target) ? hub.guidFor(target) : "__this__";
    
    // get the set of methods
    var methods = this[targetGuid] ;    
    if (!methods) return false ;
    
    methods.remove(method) ;
    if (methods.length <= 0) {
      methods.target = null;
      methods.isTargetSet = false ;
      methods.contexts = null ;
      delete this[targetGuid] ;
      this.targets-- ;
      
    } else if (methods.contexts) {
      delete methods.contexts[hub.guidFor(method)];
    }

    this._hub_membersCacheIsValid = false;
    
    return true ;
  },
  
  /**
    Returns an array of target/method pairs.  This is cached.
  */
  getMembers: function() {
    if (this._hub_membersCacheIsValid) return this._hub_members ;
    
    // need to recache, reset the array...
    if (!this._hub_members) {
      this._hub_members = [] ;
    } else this._hub_members.length = 0 ; // reset
    var ret = this._hub_members ;

    // iterate through the set, look for sets.
    for(var key in this) {
      if (!this.hasOwnProperty(key)) continue ;
      var value = this[key] ;
      if (value && value.isTargetSet) {
        var idx = value.length;
        var target = value.target ;
        
        // slightly slower - only do if we have contexts
        var contexts = value.contexts ;
        if (contexts) {
          while(--idx>=0) {
            var method = value[idx] ;
            ret.push([target, method, contexts[hub.guidFor(method)]]) ;
          }
        } else {
          while(--idx>=0) ret.push([target, value[idx]]);
        }
      }
    }

    this._hub_membersCacheIsValid = true ;
    return ret ;
  },
  
  /**
    Returns a new instance of the set with the contents cloned.
  */
  clone: function() {
    var oldSet, newSet, key, ret = hub.ObserverSet.create() ;
    for(key in this) {
      if (!this.hasOwnProperty(key)) continue ;
      oldSet = this[key];
      if (oldSet && oldSet.isTargetSet) {
        newSet = oldSet.clone();
        newSet.target = oldSet.target ;
        if (oldSet.contexts) newSet.contexts = hub.clone(oldSet.contexts);
        ret[key] = newSet ;
      }
    }
    ret.targets = this.targets ;
    ret._hub_membersCacheIsValid = false ;
    return ret ;
  },
  
  /**
    Creates a new instance of the observer set.
  */
  create: function() { return hub.beget(this); }
  
} ;

hub.ObserverSet.slice = hub.ObserverSet.clone ;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  Set to true to have all observing activity logged to hub.debug().  This 
  should be used for debugging only.
  
  NOTE: This property is not observable.
  
  @property {Boolean}
*/
hub.LOG_OBSERVERS = false ;

/**
  Key-Value-Observing (KVO) simply allows one object to observe changes to a 
  property on another object. It is one of the fundamental ways that hub.js 
  communicates changes made to your object graph. Any object that has this
  module applied to it can be used in KVO-operations.
  
  This module is applied automatically to all objects that inherit from 
  hub.Object, which includes most objects bundled with hub.js.  You will not 
  generally apply this module to classes yourself, but you will use the 
  features provided by this module frequently, so it is important to understand 
  how to use it.
  
  h2. Enabling Key Value Observing
  
  With KVO, you can write functions that will be called automatically whenever 
  a property on a particular object changes.  You can use this feature to 
  reduce the amount of "glue code" that you often write to tie the various 
  parts of your application together.
  
  To use KVO, just use the KVO-aware methods get() and set() to access 
  properties instead of accessing properties directly:
  
  {{{
    var aName = contact.get('firstName') ;
    contact.set('firstName', 'Erich') ;
  }}}
  
  Don't do this:
  
  {{{
    var aName = contact.firstName ;
    contact.firstName = 'Erich' ;
  }}}
  
  get() and set() work just like the normal "dot operators" provided by 
  JavaScript but they provide you with much more power, including not only 
  observing but computed properties as well.
  
  h2. Observing Property Changes
  
  You typically observe property changes simply by adding the observes() 
  call to the end of your method declarations in classes that you write.  For 
  example:
  
  {{{
    hub.Object.create({
      valueObserver: function() {
        // Executes whenever the 'value' property changes.
      }.observes('value')
    }) ;
  }}}
  
  Although this is the most common way to add an observer, this capability is 
  actually built into the hub.Object class on top of two methods defined in 
  this mixin called addObserver() and removeObserver().  You can use these two 
  methods to add and remove observers yourself if you need to do so at run 
  time.  
  
  To add an observer for a property, just call:
  
  {{{
    object.addObserver('aPropertyKey', targetObject, targetAction) ;
  }}}
  
  This will call the 'targetAction' method of targetObject whenever the value 
  of 'aPropertyKey' changes.
  
  h2. Observer Parameters
  
  An observer function typically does not need to accept any parameters, 
  however you can accept certain arguments when writing generic observers. 
  An observer function can have the following arguments:
  
  {{{
    propertyObserver(target, key, revision) ;
  }}}
  
  - *target* - This is the object whose value changed.  Usually the receiver.
  - *key* - The key of the value that changed.
  - *revision* - The revision of the target object.
  
  h2. Implementing Manual Change Notifications
  
  Sometimes you may want to control the rate at which notifications for 
  a property are delivered, for example by checking first to make sure 
  that the value has changed.
  
  To do this, you need to implement a computed property for the property 
  you want to change and override automaticallyNotifiesObserversFor().
  
  The example below will only notify if the "balance" property value actually 
  changes:
  
  {{{
    
    automaticallyNotifiesObserversFor: function(key) {
      return (key === 'balance') ? false : arguments.callee.base.apply() ;
    },
    
    balance: function(key, value) {
      var balance = this._balance ;
      if ((value !== undefined) && (balance !== value)) {
        this.propertyWillChange(key) ;
        balance = this._balance = value ;
        this.propertyDidChange(key) ;
      }
      return balance ;
    }
    
  }}}
  
  h1. Implementation Details
  
  Internally, hub.js keeps track of observable information by adding a number 
  of properties to the object adopting the observable.  All of these properties 
  begin with "_kvo_" to separate them from the rest of your object.
  
  @mixin
*/
hub.Observable = {

  /** 
    Walk like that ol' duck 
    
    @property {Boolean}
  */
  isObservable: true,
  
  /**
    Determines whether observers should be automatically notified of changes
    to a key.
    
    If you are manually implementing change notifications for a property, you
    can override this method to return false for properties you do not want the
    observing system to automatically notify for.
    
    The default implementation always returns true.
    
    @param key {String} the key that is changing
    @returns {Boolean} true if automatic notification should occur.
  */
  automaticallyNotifiesObserversFor: function(key) { 
    return true;
  },

  // ..........................................
  // PROPERTIES
  // 
  // Use these methods to get/set properties.  This will handle observing
  // notifications as well as allowing you to define functions that can be 
  // used as properties.

  /**  
    Retrieves the value of key from the object.
    
    This method is generally very similar to using object[key] or object.key,
    however it supports both computed properties and the unknownProperty
    handler.
    
    *Computed Properties*
    
    Computed properties are methods defined with the property() modifier
    declared at the end, such as:
    
    {{{
      fullName: function() {
        return this.getEach('firstName', 'lastName').compact().join(' ');
      }.property('firstName', 'lastName')
    }}}
    
    When you call get() on a computed property, the property function will be
    called and the return value will be returned instead of the function
    itself.
    
    *Unknown Properties*
    
    Likewise, if you try to call get() on a property whose values is
    undefined, the unknownProperty() method will be called on the object.
    If this method reutrns any value other than undefined, it will be returned
    instead.  This allows you to implement "virtual" properties that are 
    not defined upfront.
    
    @param key {String} the property to retrieve
    @returns {Object} the property value or undefined.
    
  */
  get: function(key) {
    var ret = this[key], cache ;
    if (ret === undefined) {
      return this.unknownProperty(key) ;
    } else if (ret && ret.isProperty) {
      if (ret.isCacheable) {
        cache = this._hub_kvo_cache ;
        if (!cache) cache = this._hub_kvo_cache = {};
        return (cache[ret.cacheKey] !== undefined) ? cache[ret.cacheKey] : (cache[ret.cacheKey] = ret.call(this,key)) ;
      } else return ret.call(this,key);
    } else return ret ;
  },

  /**  
    Sets the key equal to value.
    
    This method is generally very similar to calling object[key] = value or
    object.key = value, except that it provides support for computed 
    properties, the unknownProperty() method and property observers.
    
    *Computed Properties*
    
    If you try to set a value on a key that has a computed property handler
    defined (see the get() method for an example), then set() will call
    that method, passing both the value and key instead of simply changing 
    the value itself.  This is useful for those times when you need to 
    implement a property that is composed of one or more member
    properties.
    
    *Unknown Properties*
    
    If you try to set a value on a key that is undefined in the target 
    object, then the unknownProperty() handler will be called instead.  This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the obejct.  If unknownProperty() returns 
    undefined, then set() will simply set the value on the object.
    
    *Property Observers*
    
    In addition to changing the property, set() will also register a 
    property change with the object.  Unless you have placed this call 
    inside of a beginPropertyChanges() and endPropertyChanges(), any "local"
    observers (i.e. observer methods declared on the same object), will be
    called immediately.  Any "remote" observers (i.e. observer methods 
    declared on another object) will be placed in a queue and called at a
    later time in a coalesced manner.
    
    *Chaining*
    
    In addition to property changes, set() returns the value of the object
    itself so you can do chaining like this:
    
    {{{
      record.set('firstName', 'Charles').set('lastName', 'Jolley');
    }}}
    
    @param key {String} the property to set
    @param value {Object} the value to set or null.
    @returns {hub.Observable}
  */
  set: function(key, value) {
    var func   = this[key], 
        notify = this.automaticallyNotifiesObserversFor(key),
        ret    = value, 
        cachedep, cache, idx, dfunc ;

    // if there are any dependent keys and they use caching, then clear the
    // cache.
    if (this._hub_kvo_cacheable && (cache = this._hub_kvo_cache)) {
      // lookup the cached dependents for this key.  if undefined, compute.
      // note that if cachdep is set to null is means we figure out it has no
      // cached dependencies already.  this is different from undefined.
      cachedep = this._hub_kvo_cachedep;
      if (!cachedep || (cachedep = cachedep[key])===undefined) {
        cachedep = this._hub_kvo_computeCachedDependentsFor(key);
      }
      
      if (cachedep) {
        idx = cachedep.length;
        while(--idx>=0) {
          dfunc = cachedep[idx];
          cache[dfunc.cacheKey] = cache[dfunc.lastSetValueKey] = undefined;
        }
      }
    }

    // set the value.
    if (func && func.isProperty) {
      cache = this._hub_kvo_cache;
      if (func.isVolatile || !cache || (cache[func.lastSetValueKey] !== value)) {
        if (!cache) cache = this._hub_kvo_cache = {};

        cache[func.lastSetValueKey] = value ;
        if (notify) this.propertyWillChange(key) ;
        ret = func.call(this,key,value) ;

        // update cached value
        if (func.isCacheable) cache[func.cacheKey] = ret ;
        if (notify) this.propertyDidChange(key, ret, true) ;
      }

    } else if (func === undefined) {
      if (notify) this.propertyWillChange(key) ;
      this.unknownProperty(key,value) ;
      if (notify) this.propertyDidChange(key, ret) ;

    } else {
      if (this[key] !== value) {
        if (notify) this.propertyWillChange(key) ;
        ret = this[key] = value ;
        if (notify) this.propertyDidChange(key, ret) ;
      }
    }

    return this ;
  },

  /**  
    Called whenever you try to get or set an undefined property.
    
    This is a generic property handler.  If you define it, it will be called
    when the named property is not yet set in the object.  The default does
    nothing.
    
    @param key {String} the key that was requested
    @param value {Object} The value if called as a setter, undefined if called as a getter.
    @returns {Object} The new value for key.
  */
  unknownProperty: function(key,value) {
    if (!(value === undefined)) { this[key] = value; }
    return value ;
  },

  /**  
    Begins a grouping of property changes.
    
    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished.  If you plan to make a 
    large number of changes to an object at one time, you should call this 
    method at the beginning of the changes to suspend change notifications.
    When you are done making changes, all endPropertyChanges() to allow 
    notification to resume.
    
    @returns {hub.Observable}
  */
  beginPropertyChanges: function() {
    this._hub_kvo_changeLevel = (this._hub_kvo_changeLevel || 0) + 1; 
    return this;
  },

  /**  
    Ends a grouping of property changes.
    
    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished.  If you plan to make a 
    large number of changes to an object at one time, you should call 
    beginPropertyChanges() at the beginning of the changes to suspend change 
    notifications. When you are done making changes, call this method to allow 
    notification to resume.
    
    @returns {hub.Observable}
  */
  endPropertyChanges: function() {
    this._hub_kvo_changeLevel = (this._hub_kvo_changeLevel || 1) - 1 ;
    var level = this._hub_kvo_changeLevel, changes = this._hub_kvo_changes;
    if ((level<=0) && changes && (changes.length>0) && !hub.ObserverQueue.isObservingSuspended) {
      this._hub_notifyPropertyObservers() ;
    } 
    return this ;
  },

  /**  
    Notify the observer system that a property is about to change.

    Sometimes you need to change a value directly or indirectly without 
    actually calling get() or set() on it.  In this case, you can use this 
    method and propertyDidChange() instead.  Calling these two methods 
    together will notify all observers that the property has potentially 
    changed value.
    
    Note that you must always call propertyWillChange and propertyDidChange as 
    a pair.  If you do not, it may get the property change groups out of order 
    and cause notifications to be delivered more often than you would like.
    
    @param key {String} The property key that is about to change.
    @returns {hub.Observable}
  */
  propertyWillChange: function(key) {
    return this ;
  },

  /**  
    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without 
    actually calling get() or set() on it.  In this case, you can use this 
    method and propertyWillChange() instead.  Calling these two methods 
    together will notify all observers that the property has potentially 
    changed value.
    
    Note that you must always call propertyWillChange and propertyDidChange as 
    a pair. If you do not, it may get the property change groups out of order 
    and cause notifications to be delivered more often than you would like.
    
    @param key {String} The property key that has just changed.
    @param value {Object} The new value of the key.  May be null.
    @returns {hub.Observable}
  */
  propertyDidChange: function(key,value, _hub_keepCache) {

    this._hub_kvo_revision = (this._hub_kvo_revision || 0) + 1; 
    var level = this._hub_kvo_changeLevel || 0,
        cachedep, idx, dfunc, cache, func,
        log = hub.LOG_OBSERVERS && !(this.LOG_OBSERVING===false);

    if (this._hub_kvo_cacheable && (cache = this._hub_kvo_cache)) {

      // clear any cached value
      if (!_hub_keepCache) {
        func = this[key] ;
        if (func && func.isProperty) {
          cache[func.cacheKey] = cache[func.lastSetValueKey] = undefined ;
        }
      }

      // if there are any dependent keys and they use caching, then clear the
      // cache.  This is the same code as is in set.  It is inlined for perf.
      cachedep = this._hub_kvo_cachedep;
      if (!cachedep || (cachedep = cachedep[key])===undefined) {
        cachedep = this._hub_kvo_computeCachedDependentsFor(key);
      }

      if (cachedep) {
        idx = cachedep.length;
        while(--idx>=0) {
          dfunc = cachedep[idx];
          cache[dfunc.cacheKey] = cache[dfunc.lastSetValueKey] = undefined;
        }
      }
    }

    // save in the change set if queuing changes
    var suspended = hub.ObserverQueue.isObservingSuspended;
    if ((level > 0) || suspended) {
      var changes = this._hub_kvo_changes ;
      if (!changes) changes = this._hub_kvo_changes = hub.CoreSet.create() ;
      changes.add(key) ;
      
      if (suspended) {
        if (log) hub.debug([hub.KVO_SPACES,this].join(''), "will not notify observers because observing is suspended");
        hub.ObserverQueue.objectHasPendingChanges(this) ;
      }
      
    // otherwise notify property observers immediately
    } else this._hub_notifyPropertyObservers(key) ;
    
    return this ;
  },

  // ..........................................
  // DEPENDENT KEYS
  // 

  /**
    Use this to indicate that one key changes if other keys it depends on 
    change.  Pass the key that is dependent and additional keys it depends
    upon.  You can either pass the additional keys inline as arguments or 
    in a single array.
    
    You generally do not call this method, but instead pass dependent keys to
    your property() method when you declare a computed property.
    
    You can call this method during your init to register the keys that should
    trigger a change notification for your computed properties.  
    
    @param {String} key the dependent key
    @param {Array|String} dependentKeys one or more dependent keys 
    @returns {Object} this
  */  
  registerDependentKey: function(key, dependentKeys) {
    var dependents = this._hub_kvo_dependents,
        func       = this[key],
        keys, idx, lim, dep, queue;

    // normalize input.
    if (hub.typeOf(dependentKeys) === hub.T_ARRAY) {
      keys = dependentKeys;
      lim  = 0;
    } else {
      keys = arguments;
      lim  = 1;
    }
    idx  = keys.length;

    // define dependents if not defined already.
    if (!dependents) this._hub_kvo_dependents = dependents = {} ;

    // for each key, build array of dependents, add this key...
    // note that we ignore the first argument since it is the key...
    while(--idx >= lim) {
      dep = keys[idx] ;

      // add dependent key to dependents array of key it depends on
      queue = dependents[dep] ;
      if (!queue) queue = dependents[dep] = [] ;
      queue.push(key) ;
    }
  },

  /** @private 
  
    Helper method used by computeCachedDependents.  Just loops over the 
    array of dependent keys.  If the passed function is cacheable, it will
    be added to the queue.  Also, recursively call on each keys dependent 
    keys.
  
    @param {Array} queue the queue to add functions to
    @param {Array} keys the array of dependent keys for this key
    @param {Hash} dependents the _kvo_dependents cache
    @param {hub.Set} seen already seen keys
    @returns {void}
  */
  _hub_kvo_addCachedDependents: function(queue, keys, dependents, seen) {
    var idx = keys.length,
        func, key, deps ;
        
    while(--idx >= 0) {
      key  = keys[idx];
      seen.add(key);
      
      // if the value for this key is a computed property, then add it to the
      // set if it is cacheable, and process any of its dependent keys also.
      func = this[key];
      if (func && (func instanceof Function) && func.isProperty) {
        if (func.isCacheable) queue.push(func); // handle this func
        if ((deps = dependents[key]) && deps.length>0) { // and any dependents
          this._hub_kvo_addCachedDependents(queue, deps, dependents, seen);
        }
      } 
    }
        
  },
  
  /** @private

    Called by set() whenever it needs to determine which cached dependent
    keys to clear.  Recursively searches dependent keys to determine all 
    cached property direcly or indirectly affected.
    
    The return value is also saved for future reference
    
    @param {String} key the key to compute
    @returns {Array}
  */
  _hub_kvo_computeCachedDependentsFor: function(key) {
    var cached     = this._hub_kvo_cachedep,
        dependents = this._hub_kvo_dependents,
        keys       = dependents ? dependents[key] : null,
        queue, seen ;
    if (!cached) cached = this._hub_kvo_cachedep = {};

    // if there are no dependent keys, then just set and return null to avoid
    // this mess again.
    if (!keys || keys.length===0) return cached[key] = null;

    // there are dependent keys, so we need to do the work to find out if 
    // any of them or their dependent keys are cached.
    queue = cached[key] = [];
    seen  = hub._hub_TMP_SEEN_SET = (hub._hub_TMP_SEEN_SET || hub.CoreSet.create());
    seen.add(key);
    this._hub_kvo_addCachedDependents(queue, keys, dependents, seen);
    seen.clear(); // reset
    
    if (queue.length === 0) queue = cached[key] = null ; // turns out nothing
    return queue ;
  },
  
  // ..........................................
  // OBSERVERS
  // 
  
  _hub_kvo_for: function(kvoKey, type) {
    var ret = this[kvoKey] ;

    if (!this._hub_kvo_cloned) this._hub_kvo_cloned = {} ;
    
    // if the item does not exist, create it.  Unless type is passed, 
    // assume array.
    if (!ret) {
      ret = this[kvoKey] = (type === undefined) ? [] : type.create();
      this._hub_kvo_cloned[kvoKey] = true ;
      
    // if item does exist but has not been cloned, then clone it.  Note
    // that all types must implement copy().0
    } else if (!this._hub_kvo_cloned[kvoKey]) {
      ret = this[kvoKey] = ret.copy();
      this._hub_kvo_cloned[kvoKey] = true; 
    }
    
    return ret ;
  },

  /**  
    Adds an observer on a property.
    
    This is the core method used to register an observer for a property.
    
    Once you call this method, anytime the key's value is set, your observer
    will be notified.  Note that the observers are triggered anytime the
    value is set, regardless of whether it has actually changed.  Your
    observer should be prepared to handle that.
    
    You can also pass an optional context parameter to this method.  The 
    context will be passed to your observer method whenever it is triggered.
    Note that if you add the same target/method pair on a key multiple times
    with different context parameters, your observer will only be called once
    with the last context you passed.
    
    h2. Observer Methods
    
    Observer methods you pass should generally have the following signature if
    you do not pass a "context" parameter:
    
    {{{
      fooDidChange: function(sender, key, value, rev);
    }}}
    
    The sender is the object that changed.  The key is the property that
    changes.  The value property is currently reserved and unused.  The rev
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.
    
    If you pass a "context" parameter, the context will be passed before the
    revision like so:
    
    {{{
      fooDidChange: function(sender, key, value, context, rev);
    }}}
    
    Usually you will not need the value, context or revision parameters at 
    the end.  In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.
    
    @param key {String} the key to observer
    @param target {Object} the target object to invoke
    @param method {String|Function} the method to invoke.
    @param context {Object} optional context
    @returns {hub.Object} self
  */
  addObserver: function(key, target, method, context) {
    
    var kvoKey, chain, chains, observers;
    
    // normalize.  if a function is passed to target, make it the method.
    if (method === undefined) {
      method = target; target = this ;
    }
    if (!target) target = this ;
    if (hub.typeOf(method) === hub.T_STRING) method = target[method] ;
    if (!method) throw "You must pass a method to addObserver()" ;

    // Normalize key...
    key = key.toString() ;
    if (key.indexOf('.') >= 0) {
      
      // create the chain and save it for later so we can tear it down if 
      // needed.
      chain = hub._hub_ChainObserver.createChain(this, key, target, method, context);
      chain.masterTarget = target;  
      chain.masterMethod = method ;
      
      // Save in set for chain observers.
      this._hub_kvo_for(hub.keyFor('_kvo_chains', key)).push(chain);
      
    // Create observers if needed...
    } else {
      
      // Special case to support reduced properties.  If the property 
      // key begins with '@' and its value is unknown, then try to get its
      // value.  This will configure the dependent keys if needed.
      if ((this[key] === undefined) && (key.indexOf('@') === 0)) {
        this.get(key) ;
      }

      if (target === this) target = null ; // use null for observers only.
      kvoKey = hub.keyFor('_kvo_observers', key);
      this._hub_kvo_for(kvoKey, hub.ObserverSet).add(target, method, context);
      this._hub_kvo_for('_kvo_observed_keys', hub.CoreSet).add(key) ;
    }

    if (this.didAddObserver) this.didAddObserver(key, target, method);
    return this;
  },

  /**
    Remove an observer you have previously registered on this object.  Pass
    the same key, target, and method you passed to addObserver() and your 
    target will no longer receive notifications.
    
    @returns {hub.Observable} reciever
  */
  removeObserver: function(key, target, method) {
    
    var kvoKey, chains, chain, observers, idx ;
    
    // normalize.  if a function is passed to target, make it the method.
    if (method === undefined) {
      method = target; target = this ;
    }
    if (!target) target = this ;
    if (hub.typeOf(method) === hub.T_STRING) method = target[method] ;
    if (!method) throw "You must pass a method to addObserver()" ;

    // if the key contains a '.', this is a chained observer.
    key = key.toString() ;
    if (key.indexOf('.') >= 0) {
      
      // try to find matching chains
      kvoKey = hub.keyFor('_kvo_chains', key);
      if (chains = this[kvoKey]) {
        
        // if chains have not been cloned yet, do so now.
        chains = this._hub_kvo_for(kvoKey) ;
        
        // remove any chains
        idx = chains.length;
        while(--idx >= 0) {
          chain = chains[idx];
          if (chain && (chain.masterTarget===target) && (chain.masterMethod===method)) {
            chains[idx] = chain.destroyChain() ;
          }
        }
      }
      
    // otherwise, just like a normal observer.
    } else {
      if (target === this) target = null ; // use null for observers only.
      kvoKey = hub.keyFor('_kvo_observers', key) ;
      if (observers = this[kvoKey]) {
        // if observers have not been cloned yet, do so now
        observers = this._hub_kvo_for(kvoKey) ;
        observers.remove(target, method) ;
        if (observers.targets <= 0) {
          this._hub_kvo_for('_kvo_observed_keys', hub.CoreSet).remove(key);
        }
      }
    }

    if (this.didRemoveObserver) this.didRemoveObserver(key, target, method);
    return this;
  },
  
  /**
    Returns true if the object currently has observers registered for a 
    particular key.  You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.
    
    @param {String} key key to check
    @returns {Boolean}
  */
  hasObserverFor: function(key) {
    hub.ObserverQueue.flush(this) ; // hookup as many observers as possible.
    
    var observers = this[hub.keyFor('_kvo_observers', key)],
        locals    = this[hub.keyFor('_kvo_local', key)],
        members ;

    if (locals && locals.length>0) return true ;
    if (observers && observers.getMembers().length>0) return true ;
    return false ;
  },

  /**
    This method will register any observers and computed properties saved on
    the object.  Normally you do not need to call this method youself.  It
    is invoked automatically just before property notifications are sent and
    from the init() method of hub.Object.  You may choose to call this
    from your own initialization method if you are using hub.Observable in
    a non-hub.Object-based object.
    
    This method looks for several private variables, which you can setup,
    to initialize:
    
      - _hub_observers: this should contain an array of key names for observers
        you need to configure.
        
      - _hub_properties: this should contain an array of key names for computed
        properties.
        
    @returns {Object} this
  */
  initObservable: function() {
    if (this._hub_observableInited) return ;
    this._hub_observableInited = true ;
    
    var loc, keys, key, value, observer, propertyPaths, propertyPathsLength ;
    
    // Loop through observer functions and register them
    if (keys = this._hub_observers) {
      var len = keys.length ;
      for(loc=0;loc<len;loc++) {
        key = keys[loc]; observer = this[key] ;
        propertyPaths = observer.propertyPaths ;
        propertyPathsLength = (propertyPaths) ? propertyPaths.length : 0 ;
        for(var ploc=0;ploc<propertyPathsLength;ploc++) {
          var path = propertyPaths[ploc] ;
          var dotIndex = path.indexOf('.') ;
          // handle most common case, observing a local property
          if (dotIndex < 0) {
            this.addObserver(path, this, observer) ;

          // next most common case, use a chained observer
          } else if (path.indexOf('*') === 0) {
            this.addObserver(path.slice(1), this, observer) ;
            
          // otherwise register the observer in the observers queue.  This 
          // will add the observer now or later when the named path becomes
          // available.
          } else {
            var root = null ;
            
            // handle special cases for observers that look to the local root
            if (dotIndex === 0) {
              root = this; path = path.slice(1) ;
            } else if (dotIndex===4 && path.slice(0,5) === 'this.') {
              root = this; path = path.slice(5) ;
            } else if (dotIndex<0 && path.length===4 && path === 'this') {
              root = this; path = '';
            }
            
            hub.ObserverQueue.addObserver(path, this, observer, root); 
          }
        }
      }
    }

    // Add Properties
    if (keys = this._hub_properties) {
      for(loc=0;loc<keys.length;loc++) {
        key = keys[loc];
        if (value = this[key]) {

          // activate cacheable only if needed for perf reasons
          if (value.isCacheable) this._hub_kvo_cacheable = true; 

          // register dependent keys
          if (value.dependentKeys && (value.dependentKeys.length>0)) {
            this.registerDependentKey(key, value.dependentKeys) ;
          }
        }
      }
    }
    
  },
  
  // ..........................................
  // NOTIFICATION
  // 

  /**
    Returns an array with all of the observers registered for the specified
    key.  This is intended for debugging purposes only.  You generally do not
    want to rely on this method for production code.
    
    @params key {String} the key to evaluate
    @returns {Array} array of Observer objects, describing the observer.
  */
  observersForKey: function(key) {
    var observers = this._hub_kvo_for('_kvo_observers', key) ;
    return observers.getMembers() || [] ;
  },
  
  // this private method actually notifies the observers for any keys in the
  // observer queue.  If you pass a key it will be added to the queue.
  _hub_notifyPropertyObservers: function(key) {

    if (!this._hub_observableInited) this.initObservable() ;
    
    hub.ObserverQueue.flush(this) ; // hookup as many observers as possible.

    var log = hub.LOG_OBSERVERS && !(this.LOG_OBSERVING===false) ;
    var observers, changes, dependents, starObservers, idx, keys, rev ;
    var members, membersLength, member, memberLoc, target, method, loc, func ;
    var context, spaces, cache ;

    if (log) {
      spaces = hub.KVO_SPACES = (hub.KVO_SPACES || '') + '  ' ;
      hub.debug([spaces, this].join(''), hub.fmt('notifying observers after change to key "%@"', key)) ;
    }
    
    // Get any starObservers -- they will be notified of all changes.
    starObservers =  this['_kvo_observers_*'] ;
    
    // prevent notifications from being sent until complete
    this._hub_kvo_changeLevel = (this._hub_kvo_changeLevel || 0) + 1; 

    // keep sending notifications as long as there are changes
    while(((changes = this._hub_kvo_changes) && (changes.length > 0)) || key) {
      
      // increment revision
      rev = ++this.propertyRevision ;
      
      // save the current set of changes and swap out the kvo_changes so that
      // any set() calls by observers will be saved in a new set.
      if (!changes) changes = hub.CoreSet.create() ;
      this._hub_kvo_changes = null ;

      // Add the passed key to the changes set.  If a '*' was passed, then
      // add all keys in the observers to the set...
      // once finished, clear the key so the loop will end.
      if (key === '*') {
        changes.add('*') ;
        changes.addEach(this._hub_kvo_for('_kvo_observed_keys', hub.CoreSet));

      } else if (key) changes.add(key) ;

      // Now go through the set and add all dependent keys...
      if (dependents = this._hub_kvo_dependents) {

        // NOTE: each time we loop, we check the changes length, this
        // way any dependent keys added to the set will also be evaluated...
        for(idx=0;idx<changes.length;idx++) {
          key = changes[idx] ;
          keys = dependents[key] ;
          
          // for each dependent key, add to set of changes.  Also, if key
          // value is a cacheable property, clear the cached value...
          if (keys && (loc = keys.length)) {
            if (log) hub.debug(hub.fmt("%@...including dependent keys for %@: %@", spaces, key, keys));
            cache = this._hub_kvo_cache;
            if (!cache) cache = this._hub_kvo_cache = {};
            while(--loc >= 0) {
              changes.add(key = keys[loc]);
              if (func = this[key]) {
                this[func.cacheKey] = undefined;
                cache[func.cacheKey] = cache[func.lastSetValueKey] = undefined;
              } // if (func=)
            } // while (--loc)
          } // if (keys && 
        } // for(idx...
      } // if (dependents...)

      // now iterate through all changed keys and notify observers.
      while(changes.length > 0) {
        key = changes.pop() ; // the changed key

        // find any observers and notify them...
        observers = this[hub.keyFor('_kvo_observers', key)];
        if (observers) {
          members = observers.getMembers() ;
          membersLength = members.length ;
          for(memberLoc=0;memberLoc < membersLength; memberLoc++) {
            member = members[memberLoc] ;
            if (member[3] === rev) continue ; // skip notified items.

            target = member[0] || this; 
            method = member[1] ; 
            context = member[2];
            member[3] = rev;
            
            if (log) hub.debug(hub.fmt('%@...firing observer on %@ for key "%@"', spaces, target, key));
            if (context !== undefined) {
              method.call(target, this, key, null, context, rev);
            } else {
              method.call(target, this, key, null, rev) ;
            }
          }
        }

        // look for local observers.  Local observers are added by hub.Object
        // as an optimization to avoid having to add observers for every 
        // instance when you are just observing your local object.
        members = this[hub.keyFor('_kvo_local', key)];
        if (members) {
          membersLength = members.length ;
          for(memberLoc=0;memberLoc<membersLength;memberLoc++) {
            member = members[memberLoc];
            method = this[member] ; // try to find observer function
            if (method) {
              if (log) hub.debug(hub.fmt('%@...firing local observer %@.%@ for key "%@"', spaces, this, member, key));
              method.call(this, this, key, null, rev);
            }
          }
        }
        
        // if there are starObservers, do the same thing for them
        if (starObservers && key !== '*') {          
          members = starObservers.getMembers() ;
          membersLength = members.length ;
          for(memberLoc=0;memberLoc < membersLength; memberLoc++) {
            member = members[memberLoc] ;
            target = member[0] || this; 
            method = member[1] ;
            context = member[2] ;
            
            if (log) hub.debug(hub.fmt('%@...firing * observer on %@ for key "%@"', spaces, target, key));
            if (context !== undefined) {
              method.call(target, this, key, null, context, rev);
            } else {
              method.call(target, this, key, null, rev) ;
            }
          }
        }

        // if there is a default property observer, call that also
        if (this.propertyObserver) {
          if (log) hub.debug(hub.fmt('%@...firing %@.propertyObserver for key "%@"', spaces, this, key));
          this.propertyObserver(this, key, rev) ;
        }
      } // while(changes.length>0)

      // changes set should be empty. release it for reuse
      if (changes) changes.destroy() ;
      
      // key is no longer needed; clear it to avoid infinite loops
      key = null ; 
      
    } // while (changes)
    
    // done with loop, reduce change level so that future sets can resume
    this._hub_kvo_changeLevel = (this._hub_kvo_changeLevel || 1) - 1; 
    
    if (log) hub.KVO_SPACES = spaces.slice(0, -2);
    
    return true ; // finished successfully
  },
  
  /**
    didChangeFor makes it easy for you to verify that you haven't seen any
    changed values.  You need to use this if your method observes multiple
    properties.  To use this, call it like this:
    
    if (this.didChangeFor('render','height','width')) {
       // DO SOMETHING HERE IF CHANGED.
    }
  */  
  didChangeFor: function(context) { 
    context = hub.hashFor(context) ; // get a hash key we can use in caches.
    
    // setup caches...
    var valueCache = this._hub_kvo_didChange_valueCache ;
    if (!valueCache) valueCache = this._hub_kvo_didChange_valueCache = {};
    var revisionCache = this._hub_kvo_didChange_revisionCache;
    if (!revisionCache) revisionCache=this._hub_kvo_didChange_revisionCache={};
    
    // get the cache of values and revisions already seen in this context
    var seenValues = valueCache[context] || {} ;
    var seenRevisions = revisionCache[context] || {} ;
    
    // prepare too loop!
    var ret = false ;
    var currentRevision = this._hub_kvo_revision || 0  ;
    var idx = arguments.length ;
    while(--idx >= 1) {  // NB: loop only to 1 to ignore context arg.
      var key = arguments[idx];
      
      // has the kvo revision changed since the last time we did this?
      if (seenRevisions[key] != currentRevision) {
        // yes, check the value with the last seen value
        var value = this.get(key) ;
        if (seenValues[key] !== value) {
          ret = true ; // did change!
          seenValues[key] = value;
        }
      }
      seenRevisions[key] = currentRevision;
    }
    
    valueCache[context] = seenValues ;
    revisionCache[context] = seenRevisions ;
    return ret ;
  },

  /**
    Sets the property only if the passed value is different from the
    current value.  Depending on how expensive a get() is on this property,
    this may be more efficient.
    
    @param key {String} the key to change
    @param value {Object} the value to change
    @returns {hub.Observable}
  */
  setIfChanged: function(key, value) {
    return (this.get(key) !== value) ? this.set(key, value) : this ;
  },
  
  /**
    Navigates the property path, returning the value at that point.
    
    If any object in the path is undefined, returns undefined.
  */
  getPath: function(path) {
    var tuple = hub.tupleForPropertyPath(path, this) ;
    if (tuple === null || tuple[0] === null) return undefined ;
    return tuple[0].get(tuple[1]) ;
  },
  
  /**
    Navigates the property path, finally setting the value.
    
    @param path {String} the property path to set
    @param value {Object} the value to set
    @returns {hub.Observable}
  */
  setPath: function(path, value) {
    if (path.indexOf('.') >= 0) {
      var tuple = hub.tupleForPropertyPath(path, this) ;
      if (!tuple || !tuple[0]) return null ;
      tuple[0].set(tuple[1], value) ;
    } else this.set(path, value) ; // shortcut
    return this;
  },

  /**
    Navigates the property path, finally setting the value but only if 
    the value does not match the current value.  This will avoid sending
    unecessary change notifications.
    
    @param path {String} the property path to set
    @param value {Object} the value to set
    @returns {Object} this
  */
  setPathIfChanged: function(path, value) {
    if (path.indexOf('.') >= 0) {
      var tuple = hub.tupleForPropertyPath(path, this) ;
      if (!tuple || !tuple[0]) return null ;
      if (tuple[0].get(tuple[1]) !== value) {
        tuple[0].set(tuple[1], value) ;
      }
    } else this.setIfChanged(path, value) ; // shortcut
    return this;
  },
  
  /** 
    Convenience method to get an array of properties.
    
    Pass in multiple property keys or an array of property keys.  This
    method uses getPath() so you can also pass key paths.

    @returns {Array} Values of property keys.
  */
  getEach: function() {
    var keys = hub.A(arguments) ;
    var ret = [];
    for(var idx=0; idx<keys.length;idx++) {
      ret[ret.length] = this.getPath(keys[idx]);
    }
    return ret ;
  },
  
  
  /**  
    Increments the value of a property.
    
    @param key {String} property name
    @returns {Number} new value of property
  */
  incrementProperty: function(key) { 
    this.set(key,(this.get(key) || 0)+1); 
    return this.get(key) ;
  },

  /**  
    decrements a property
    
    @param key {String} property name
    @returns {Number} new value of property
  */
  decrementProperty: function(key) {
    this.set(key,(this.get(key) || 0) - 1 ) ;
    return this.get(key) ;
  },

  /**  
    Inverts a property.  Property should be a bool.
    
    @param key {String} property name
    @param value {Object} optional parameter for "true" value
    @param alt {Object} optional parameter for "false" value
    @returns {Object} new value
  */
  toggleProperty: function(key,value,alt) { 
    if (value === undefined) value = true ;
    if (alt === undefined) alt = false ;
    value = (this.get(key) == value) ? alt : value ;
    this.set(key,value);
    return this.get(key) ;
  },

  /**
    Convenience method to call propertyWillChange/propertyDidChange.
    
    Sometimes you need to notify observers that a property has changed value 
    without actually changing this value.  In those cases, you can use this 
    method as a convenience instead of calling propertyWillChange() and 
    propertyDidChange().
    
    @param key {String} The property key that has just changed.
    @param value {Object} The new value of the key.  May be null.
    @returns {hub.Observable}
  */
  notifyPropertyChange: function(key, value) {
    this.propertyWillChange(key) ;
    this.propertyDidChange(key, value) ;
    return this; 
  },
  
  /**  
    Notifies all of observers of a property changes.
    
    Sometimes when you make a major update to your object, it is cheaper to
    simply notify all observers that their property might have changed than
    to figure out specifically which properties actually did change.
    
    In those cases, you can simply call this method to notify all property
    observers immediately.  Note that this ignores property groups.
    
    @returns {hub.Observable}
  */
  allPropertiesDidChange: function() {
    this._hub_kvo_cache = null; //clear cached props
    this._hub_notifyPropertyObservers('*') ;
    return this ;
  },

  addProbe: function(key) { this.addObserver(key,hub.logChange); },
  removeProbe: function(key) { this.removeObserver(key,hub.logChange); },

  /**
    Logs the named properties hub.debug.
    
    @param {String...} propertyNames one or more property names
  */
  logProperty: function() {
    var props = hub.A(arguments) ;
    for(var idx=0;idx<props.length; idx++) {
      var prop = props[idx] ;
      hub.debug(hub.fmt('%@:%@', hub.guidFor(this), prop), this.get(prop)) ;
    }
  },

  propertyRevision: 1
    
} ;

/** @private used by addProbe/removeProbe */
hub.logChange = function logChange(target, key, value) {
  hub.debug(hub.fmt("CHANGE", "%@[%@] => %@", target, key, target.get(key))) ;
};

// Make all Array's observable
hub.mixin(Array.prototype, hub.Observable) ;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  An object that iterates over all of the values in an enumerable object.
  
  An instance of this object is returned when you call the enumerator() method 
  on an object that implements the hub.Enumerable mixin.
  
  Once you create an enumerator instance, you can call nextObject() on it
  until you can iterated through the entire collection.  Once you have
  exhausted the enumerator, you can reuse it if you want by calling reset().
  
  NOTE: This class is not observable.
  
  @class
*/
hub.Enumerator = function(enumerableObject) {
  this.enumerable = enumerableObject ;
  this.reset() ;
  return this ;
};

hub.Enumerator.prototype = {
  
  /** 
    Returns the next object in the enumeration or undefined when complete.
    
    @returns {Object} the next object or undefined
  */
  nextObject: function() {
    var index = this._hub_index ;
    var len = this._hub_length;
    if (index >= len) return undefined ; // nothing to do
    
    // get the value
    var ret = this.enumerable.nextObject(index, this._hub_previousObject, this._hub_context) ;
    this._hub_previousObject = ret ;
    this._hub_index = index + 1 ;
    
    if (index >= len) {
      this._hub_context = hub.Enumerator._hub_pushContext(this._hub_context); 
    }
    
    return ret ;
  },
  
  /**
    Resets the enumerator to the beginning.  This is a nice way to reuse an 
    existing enumerator.
    
    @returns {hub.Enumerator} receiver
  */
  reset: function() {
    var e = this.enumerable ;
    if (!e) throw hub.E("Enumerator has been destroyed");
    this._hub_length = e.get ? e.get('length') : e.length ;
    var len = this._hub_length;
    this._hub_index = 0;
    this._hub_previousObject = null ;
    this._hub_context = (len > 0) ? hub.Enumerator._hub_popContext() : null;
  },
  
  /**
    Releases the enumerators enumerable object.  You cannot use this object
    anymore.  This is not often needed but it is useful when you need to 
    make sure memory gets cleared.
    
    @returns {void}
  */
  destroy: function() {
    this.enumerable = this._hub_length = this._hub_index = null ;
    this._hub_previousObject = this._hub_context = null ;
  }
  
} ;

/**
  Use this method to manually create a new Enumerator object.  Usually you
  will not access this method directly but instead call enumerator() on the
  item you want to enumerate.

  @param {hub.Enumerable} enumerableObject
  @returns {hub.Enumerator}
*/
hub.Enumerator.create = function(enumerableObject) {
  return new hub.Enumerator(enumerableObject) ;
};

// Private context caching methods.  This avoids recreating lots of context 
// objects.

/* @private */
hub.Enumerator._hub_popContext = function() {
  var ret = this._hub_contextCache ? this._hub_contextCache.pop() : null ;
  return ret || {} ;
} ;

/* @private */
hub.Enumerator._hub_pushContext = function(context) {
  this._hub_contextCache = this._hub_contextCache || [] ;
  var cache = this._hub_contextCache;
  cache.push(context);
  return null ;
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  This mixin defines the common interface implemented by enumerable objects 
  in hub.js.  Most of these methods follow the standard Array iteration
  API defined up to JavaScript 1.8 (excluding language-specific features that
  cannot be emulated in older versions of JavaScript).
  
  This mixin is applied automatically to the Array class on page load, so you
  can use any of these methods on simple arrays.  If Array already implements
  one of these methods, the mixin will not override them.
  
  h3. Writing Your Own Enumerable

  To make your own custom class enumerable, you need two items:
  
  1. You must have a length property.  This property should change whenever
     the number of items in your enumerable object changes.  If you using this
     with an hub.Object subclass, you should be sure to change the length 
     property using set().
     
  2. If you must implement nextObject().  See documentation.
    
  Once you have these two methods implement, apply the hub.Enumerable mixin
  to your class and you will be able to enumerate the contents of your object
  like any other collection.
  
  h3. Using hub.js Enumeration with Other Libraries
  
  Many other libraries provide some kind of iterator or enumeration like
  facility.  This is often where the most common API conflicts occur. 
  hub.js's API is designed to be as friendly as possible with other libraries 
  by implementing only methods that mostly correspond to the JavaScript 1.8 API.
  
  @mixin
*/
hub.Enumerable = {

  /** 
    Walk like a duck.
    
    @property {Boolean}
  */
  isEnumerable: true,
  
  /**
    Implement this method to make your class enumerable.
    
    This method will be call repeatedly during enumeration.  The index value
    will always begin with 0 and increment monotonically.  You don't have to
    rely on the index value to determine what object to return, but you should
    always check the value and start from the beginning when you see the
    requested index is 0.
    
    The previousObject is the object that was returned from the last call
    to nextObject for the current iteration.  This is a useful way to 
    manage iteration if you are tracing a linked list, for example.
    
    Finally the context paramter will always contain a hash you can use as 
    a "scratchpad" to maintain any other state you need in order to iterate
    properly.  The context object is reused and is not reset between 
    iterations so make sure you setup the context with a fresh state whenever
    the index parameter is 0.
    
    Generally iterators will continue to call nextObject until the index
    reaches the your current length-1.  If you run out of data before this 
    time for some reason, you should simply return undefined.
    
    The default impementation of this method simply looks up the index.
    This works great on any Array-like objects.
    
    @param index {Number} the current index of the iteration
    @param previousObject {Object} the value returned by the last call to nextObject.
    @param context {Object} a context object you can use to maintain state.
    @returns {Object} the next object in the iteration or undefined   
  */ 
  nextObject: function(index, previousObject, context) {
    return this.objectAt ? this.objectAt(index) : this[index] ;
  },
  
  /**
    Helper method returns the first object from a collection.
    
    If you override this method, you should implement it so that it will 
    always return the same value each time it is called.  If your enumerable
    contains only one object, this method should always return that object.
    If your enumerable is empty, this method should return undefined.
    
    @returns {Object} the object or undefined
  */
  firstObject: function() {
    if (this.get('length')===0) return undefined ;
    if (this.objectAt) return this.objectAt(0); // support arrays out of box
    
    // handle generic enumerables
    var context = hub.Enumerator._hub_popContext(), ret;
    ret = this.nextObject(0, null, context);
    context = hub.Enumerator._hub_pushContext(context);  
    return ret ;
  }.property(),
  
  /**
    Returns a new enumerator for this object.  See hub.Enumerator for
    documentation on how to use this object.  Enumeration is an alternative
    to using one of the other iterators described here.
    
    @returns {hub.Enumerator} an enumerator for the receiver
  */
  enumerator: function() { return hub.Enumerator.create(this); },
  
  /**
    Iterates through the enumerable, calling the passed function on each
    item.  This method corresponds to the forEach() method defined in 
    JavaScript 1.6.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(item, index, enumerable) ;      
    }}}
    
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.
    
    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.
    
    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Object} this
  */
  forEach: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;
    
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      callback.call(target, next, idx, this);
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return this ;
  },
  
  /**
    Retrieves the named value on each member object.  This is more efficient
    than using one of the wrapper methods defined here.  Objects that 
    implement hub.Observable will use the get() method, otherwise the property
    will be accessed directly.
    
    @param {String} key the key to retrieve
    @returns {Array} extracted values
  */
  getEach: function(key) {
    return this.map(function(next) {
      return next ? (next.get ? next.get(key) : next[key]) : null;
    }, this);
  },

  /**
    Sets the value on the named property for each member.  This is more
    efficient than using other methods defined on this helper.  If the object
    implements hub.Observable, the value will be changed to set(), otherwise
    it will be set directly.  null objects are skipped.
    
    @param {String} key the key to set
    @param {Object} value the object to set
    @returns {Object} receiver
  */
  setEach: function(key, value) {
    this.forEach(function(next) {
      if (next) {
        if (next.set) next.set(key, value) ;
        else next[key] = value ;
      }
    }, this);
    return this ;
  },
  
  /**
    Maps all of the items in the enumeration to another value, returning 
    a new array.  This method corresponds to map() defined in JavaScript 1.6.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(item, index, enumerable) ;      
    }}}
    
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.
    
    It should return the mapped value.
    
    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.
    
    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Array} The mapped array.
  */
  map: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;
    
    var ret  = [];
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      ret[idx] = callback.call(target, next, idx, this) ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.
    
    @params key {String} name of the property
    @returns {Array} The mapped array.
  */
  mapProperty: function(key) {
    return this.map(function(next) { 
      return next ? (next.get ? next.get(key) : next[key]) : null;
    });
  },

  /**
    Returns an array with all of the items in the enumeration that the passed
    function returns true for. This method corresponds to filter() defined in 
    JavaScript 1.6.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(item, index, enumerable) ;      
    }}}
    
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.
    
    It should return true to include the item in the results, false otherwise.
    
    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.
    
    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Array} A filtered array.
  */
  filter: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;
    
    var ret  = [];
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      if(callback.call(target, next, idx, this)) ret.push(next) ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /** 
    Returns an array sorted by the value of the passed key parameters.
    null objects will be sorted first.  You can pass either an array of keys
    or multiple parameters which will act as key names
    
    @param {String} key one or more key names
    @returns {Array}
  */
  sortProperty: function(key) {
    var keys = (typeof key === hub.T_STRING) ? arguments : key,
        len  = keys.length,
        src;
     
    // get the src array to sort   
    if (this instanceof Array) src = this;
    else {
      src = [];
      this.forEach(function(i) { src.push(i); });
    }
    
    if (!src) return [];
    return src.sort(function(a,b) {
      var idx, key, aValue, bValue, ret = 0;
      
      for(idx=0;ret===0 && idx<len;idx++) {
        key = keys[idx];
        aValue = a ? (a.get ? a.get(key) : a[key]) : null;
        bValue = b ? (b.get ? b.get(key) : b[key]) : null;
        ret = hub.compare(aValue, bValue);
      }
      return ret ;
    });
  },
  

  /**
    Returns an array with just the items with the matched property.  You
    can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to true.
    
    @params key {String} the property to test
    @param value {String} optional value to test against.
    @returns {Array} filtered array
  */
  filterProperty: function(key, value) {
    var len = this.get ? this.get('length') : this.length ;
    var ret  = [];
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      var cur = next ? (next.get ? next.get(key) : next[key]) : null;
      var matched = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      if (matched) ret.push(next) ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },
    
  /**
    Returns the first item in the array for which the callback returns true.
    This method works similar to the filter() method defined in JavaScript 1.6
    except that it will stop working on the array once a match is found.

    The callback method you provide should have the following signature (all
    parameters are optional):

    {{{
      function(item, index, enumerable) ;      
    }}}

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return true to include the item in the results, false otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Object} Found item or null.
  */
  find: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;

    var last = null, next, found = false, ret = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len && !found;idx++) {
      next = this.nextObject(idx, last, context) ;
      if (found = callback.call(target, next, idx, this)) ret = next ;
      last = next ;
    }
    next = last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /**
    Returns an the first item with a property matching the passed value.  You
    can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to true.
    
    This method works much like the more generic find() method.
    
    @params key {String} the property to test
    @param value {String} optional value to test against.
    @returns {Object} found item or null
  */
  findProperty: function(key, value) {
    var len = this.get ? this.get('length') : this.length ;
    var found = false, ret = null, last = null, next, cur ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len && !found;idx++) {
      next = this.nextObject(idx, last, context) ;
      cur = next ? (next.get ? next.get(key) : next[key]) : null;
      found = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      if (found) ret = next ;
      last = next ;
    }
    last = next = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },
      
  /**
    Returns true if the passed function returns true for every item in the
    enumeration.  This corresponds with the every() method in JavaScript 1.6.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(item, index, enumerable) ;      
    }}}
    
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.
    
    It should return the true or false.
    
    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.
    
    h4. Example Usage
    
    {{{
      if (people.every(isEngineer)) { Paychecks.addBigBonus(); }
    }}}
    
    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Boolean} 
  */
  every: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;
    
    var ret  = true;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;ret && (idx<len);idx++) {
      var next = this.nextObject(idx, last, context) ;
      if(!callback.call(target, next, idx, this)) ret = false ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /**
    Returns true if the passed property resolves to true for all items in the
    enumerable.  This method is often simpler/faster than using a callback.

    @params key {String} the property to test
    @param value {String} optional value to test against.
    @returns {Array} filtered array
  */
  everyProperty: function(key, value) {
    var len = this.get ? this.get('length') : this.length ;
    var ret  = true;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;ret && (idx<len);idx++) {
      var next = this.nextObject(idx, last, context) ;
      var cur = next ? (next.get ? next.get(key) : next[key]) : null;
      ret = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },
  
  
  /**
    Returns true if the passed function returns true for any item in the 
    enumeration. This corresponds with the every() method in JavaScript 1.6.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(item, index, enumerable) ;
    }}}
    
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.
    
    It should return the true to include the item in the results, false 
    otherwise.
    
    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.
    
    h4. Usage Example
    
    {{{
      if (people.some(isManager)) { Paychecks.addBiggerBonus(); }
    }}}
    
    @params callback {Function} the callback to execute
    @params target {Object} the target object to use
    @returns {Array} A filtered array.
  */
  some: function(callback, target) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) target = null;
    
    var ret  = false;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;(!ret) && (idx<len);idx++) {
      var next = this.nextObject(idx, last, context) ;
      if(callback.call(target, next, idx, this)) ret = true ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /**
    Returns true if the passed property resolves to true for any item in the
    enumerable.  This method is often simpler/faster than using a callback.

    @params key {String} the property to test
    @param value {String} optional value to test against.
    @returns {Boolean}
  */
  someProperty: function(key, value) {
    var len = this.get ? this.get('length') : this.length ;
    var ret  = false;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0; !ret && (idx<len); idx++) {
      var next = this.nextObject(idx, last, context) ;
      var cur = next ? (next.get ? next.get(key) : next[key]) : null;
      ret = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;  // return the invert
  },

  /**
    This will combine the values of the enumerator into a single value. It 
    is a useful way to collect a summary value from an enumeration.  This
    corresponds to the reduce() method defined in JavaScript 1.8.
    
    The callback method you provide should have the following signature (all
    parameters are optional):
    
    {{{
      function(previousValue, item, index, enumerable) ;      
    }}}
    
    - *previousValue* is the value returned by the last call to the iterator.
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    Return the new cumulative value.

    In addition to the callback you can also pass an initialValue.  An error
    will be raised if you do not pass an initial value and the enumerator is
    empty.

    Note that unlike the other methods, this method does not allow you to 
    pass a target object to set as this for the callback.  It's part of the
    spec. Sorry.
    
    @params callback {Function} the callback to execute
    @params initialValue {Object} initial value for the reduce
    @params reducerProperty {String} internal use only.  May not be available.
    @returns {Array} A filtered array.
  */
  reduce: function(callback, initialValue, reducerProperty) {
    if (typeof callback !== "function") throw new TypeError() ;
    var len = this.get ? this.get('length') : this.length ;

    // no value to return if no initial value & empty
    if (len===0 && initialValue === undefined) throw new TypeError();
    
    var ret  = initialValue;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(var idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      
      // while ret is still undefined, just set the first value we get as ret.
      // this is not the ideal behavior actually but it matches the FireFox
      // implementation... :(
      if (next !== null) {
        if (ret === undefined) {
          ret = next ;
        } else {
          ret = callback.call(null, ret, next, idx, this, reducerProperty);
        }
      }
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    
    // uh oh...we never found a value!
    if (ret === undefined) throw new TypeError() ;
    return ret ;
  },
  
  /**
    Invokes the named method on every object in the receiver that
    implements it.  This method corresponds to the implementation in
    Prototype 1.6.
    
    @param methodName {String} the name of the method
    @param args {Object...} optional arguments to pass as well.
    @returns {Array} return values from calling invoke.
  */
  invoke: function(methodName) {
    var len = this.get ? this.get('length') : this.length ;
    if (len <= 0) return [] ; // nothing to invoke....
    
    var idx;
    
    // collect the arguments
    var args = [] ;
    var alen = arguments.length ;
    if (alen > 1) {
      for(idx=1;idx<alen;idx++) args.push(arguments[idx]) ;
    }
    
    // call invoke
    var ret = [] ;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(idx=0;idx<len;idx++) {
      var next = this.nextObject(idx, last, context) ;
      var method = next ? next[methodName] : null ;
      if (method) ret[idx] = method.apply(next, args) ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },

  /**
    Invokes the passed method and optional arguments on the receiver elements
    as long as the methods return value matches the target value.  This is 
    a useful way to attempt to apply changes to a collection of objects unless
    or until one fails.

    @param targetValue {Object} the target return value
    @param methodName {String} the name of the method
    @param args {Object...} optional arguments to pass as well.
    @returns {Array} return values from calling invoke.
  */
  invokeWhile: function(targetValue, methodName) {
    var len = this.get ? this.get('length') : this.length ;
    if (len <= 0) return null; // nothing to invoke....

    var idx;

    // collect the arguments
    var args = [] ;
    var alen = arguments.length ;
    if (alen > 2) {
      for(idx=2;idx<alen;idx++) args.push(arguments[idx]) ;
    }
    
    // call invoke
    var ret = targetValue ;
    var last = null ;
    var context = hub.Enumerator._hub_popContext();
    for(idx=0;(ret === targetValue) && (idx<len);idx++) {
      var next = this.nextObject(idx, last, context) ;
      var method = next ? next[methodName] : null ;
      if (method) ret = method.apply(next, args) ;
      last = next ;
    }
    last = null ;
    context = hub.Enumerator._hub_pushContext(context);
    return ret ;
  },
  
  /**
    Simply converts the enumerable into a genuine array.  The order, of
    course, is not gauranteed.  Corresponds to the method implemented by 
    Prototype.
        
    @returns {Array} the enumerable as an array.
  */
  toArray: function() {
    var ret = [];
    this.forEach(function(o) { ret.push(o); }, this);
    return ret ;
  }        
  
} ;

// Build in a separate function to avoid unintential leaks through closures...
hub._hub_buildReducerFor = function(reducerKey, reducerProperty) {
  return function(key, value) {
    var reducer = this[reducerKey] ;
    if (hub.typeOf(reducer) !== hub.T_FUNCTION) {
      return this.unknownProperty ? this.unknownProperty(key, value) : null;
    } else {
      // Invoke the reduce method defined in enumerable instead of using the
      // one implemented in the receiver.  The receiver might be a native 
      // implementation that does not support reducerProperty.
      var ret = hub.Enumerable.reduce.call(this, reducer, null, reducerProperty) ;
      return ret ;
    }
  }.property('[]') ;
};

hub.Reducers = /** @lends hub.Enumerable */ {
  /**
    This property will trigger anytime the enumerable's content changes.
    You can observe this property to be notified of changes to the enumerables
    content.
    
    For plain enumerables, this property is read only.  hub.Array overrides
    this method.
    
    @property {hub.Array}
  */
  '[]': function(key, value) { return this ; }.property(),

  /**
    Invoke this method when the contents of your enumerable has changed.
    This will notify any observers watching for content changes.  If your are
    implementing an ordered enumerable (such as an array), also pass the 
    start and end values where the content changed so that it can be used to
    notify range observers.
    
    @param {Number} start optional start offset for the content change
    @param {Number} length optional length of change
    @returns {Object} receiver 
  */
  enumerableContentDidChange: function(start, length) {
    this.notifyPropertyChange('[]') ;
    return this ;
  },
  
  /**
    Call this method from your unknownProperty() handler to implement 
    automatic reduced properties.  A reduced property is a property that 
    collects its contents dynamically from your array contents.  Reduced 
    properties always begin with "@".  Getting this property will call 
    reduce() on your array with the function matching the key name as the
    processor.
    
    The return value of this will be either the return value from the 
    reduced property or undefined, which means this key is not a reduced 
    property.  You can call this at the top of your unknownProperty handler
    like so:
    
    {{{
      unknownProperty: function(key, value) {
        var ret = this.handleReduceProperty(key, value) ;
        if (ret === undefined) {
          // process like normal
        }
      }
    }}}
     
    @param {String} key
      the reduce property key
    
    @param {Object} value
      a value or undefined.
    
    @param {Boolean} generateProperty
      only set to false if you do not want an optimized computed property 
      handler generated for this.  Not common.
  
    @returns {Object} the reduced property or undefined
  */
  reducedProperty: function(key, value, generateProperty) {
     
    if (!key || key.charAt(0) !== '@') return undefined ; // not a reduced property
    
    // get the reducer key and the reducer
    var matches = key.match(/^@([^(]*)(\(([^)]*)\))?$/) ;
    if (!matches || matches.length < 2) return undefined ; // no match
    
    var reducerKey = matches[1]; // = 'max' if key = '@max(balance)'
    var reducerProperty = matches[3] ; // = 'balance' if key = '@max(balance)'
    reducerKey = "reduce" + reducerKey.slice(0,1).toUpperCase() + reducerKey.slice(1);
    var reducer = this[reducerKey] ;

    // if there is no reduce function defined for this key, then we can't 
    // build a reducer for it.
    if (hub.typeOf(reducer) !== hub.T_FUNCTION) return undefined;
    
    // if we can't generate the property, just run reduce
    if (generateProperty === false) {
      return hub.Enumerable.reduce.call(this, reducer, null, reducerProperty) ;
    }

    // ok, found the reducer.  Let's build the computed property and install
    var func = hub._hub_buildReducerFor(reducerKey, reducerProperty);
    var p = this.constructor.prototype ;
    
    if (p) {
      p[key] = func ;
      
      // add the function to the properties array so that new instances
      // will have their dependent key registered.
      var props = p._hub_properties || [] ;
      props.push(key) ;
      p._hub_properties = props ;
      this.registerDependentKey(key, '[]') ;
    }
    
    // and reduce anyway...
    return hub.Enumerable.reduce.call(this, reducer, null, reducerProperty) ;
  },
  
  /** 
    Reducer for @max reduced property.
  */
  reduceMax: function(previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    if (previousValue === null) return item ;
    return (item > previousValue) ? item : previousValue ;
  },

  /** 
    Reducer for @maxObject reduced property.
  */
  reduceMaxObject: function(previousItem, item, index, e, reducerProperty) {
    
    // get the value for both the previous and current item.  If no
    // reducerProperty was supplied, use the items themselves.
    var previousValue = previousItem, itemValue = item ;
    if (reducerProperty) {
      if (item) {
        itemValue = item.get ? item.get(reducerProperty) : item[reducerProperty] ;
      }
      
      if (previousItem) {
        previousValue = previousItem.get ? previousItem.get(reducerProperty) : previousItem[reducerProperty] ;
      }
    }
    if (previousValue === null) return item ;
    return (itemValue > previousValue) ? item : previousItem ;
  },

  /** 
    Reducer for @min reduced property.
  */
  reduceMin: function(previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    if (previousValue === null) return item ;
    return (item < previousValue) ? item : previousValue ;
  },

  /** 
    Reducer for @maxObject reduced property.
  */
  reduceMinObject: function(previousItem, item, index, e, reducerProperty) {

    // get the value for both the previous and current item.  If no
    // reducerProperty was supplied, use the items themselves.
    var previousValue = previousItem, itemValue = item ;
    if (reducerProperty) {
      if (item) {
        itemValue = item.get ? item.get(reducerProperty) : item[reducerProperty] ;
      }
      
      if (previousItem) {
        previousValue = previousItem.get ? previousItem.get(reducerProperty) : previousItem[reducerProperty] ;
      }
    }
    if (previousValue === null) return item ;
    return (itemValue < previousValue) ? item : previousItem ;
  },

  /** 
    Reducer for @average reduced property.
  */
  reduceAverage: function(previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    var ret = (previousValue || 0) + item ;
    var len = e.get ? e.get('length') : e.length;
    if (index >= len-1) ret = ret / len; //avg after last item.
    return ret ; 
  },

  /** 
    Reducer for @sum reduced property.
  */
  reduceSum: function(previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    return (previousValue === null) ? item : previousValue + item ;
  }
} ;

// Apply reducers...
hub.mixin(hub.Enumerable, hub.Reducers) ;
hub.mixin(Array.prototype, hub.Reducers) ;
Array.prototype.isEnumerable = true ;

// ......................................................
// ARRAY SUPPORT
//

// Implement the same enhancements on Array.  We use specialized methods
// because working with arrays are so common.
(function() {
  
  // These methods will be applied even if they already exist b/c we do it
  // better.
  var alwaysMixin = {
    
    // this is supported so you can get an enumerator.  The rest of the
    // methods do not use this just to squeeze every last ounce of perf as
    // possible.
    nextObject: hub.Enumerable.nextObject,
    enumerator: hub.Enumerable.enumerator,
    firstObject: hub.Enumerable.firstObject,
    sortProperty: hub.Enumerable.sortProperty,
    
    // see above...
    mapProperty: function(key) {
      var len = this.length ;
      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret[idx] = next ? (next.get ? next.get(key) : next[key]) : null;
      }
      return ret ;
    },

    filterProperty: function(key, value) {
      var len = this.length ;
      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        var matched = (value === undefined) ? !!cur : hub.isEqual(cur, value);
        if (matched) ret.push(next) ;
      }
      return ret ;
    },    
    
    find: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var next, ret = null, found = false;
      for(var idx=0;idx<len && !found;idx++) {
        next = this[idx] ;
        if(found = callback.call(target, next, idx, this)) ret = next ;
      }
      next = null;
      return ret ;
    },

    findProperty: function(key, value) {
      var len = this.length ;
      var next, cur, found=false, ret=null;
      for(var idx=0;idx<len && !found;idx++) {
        cur = (next=this[idx]) ? (next.get ? next.get(key): next[key]):null;
        found = (value === undefined) ? !!cur : hub.isEqual(cur, value);
        if (found) ret = next ;
      }
      next=null;
      return ret ;
    },    

    everyProperty: function(key, value) {
      var len = this.length ;
      var ret  = true;
      for(var idx=0;ret && (idx<len);idx++) {
        var next = this[idx] ;
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      }
      return ret ;
    },
    
    someProperty: function(key, value) {
      var len = this.length ;
      var ret  = false;
      for(var idx=0; !ret && (idx<len); idx++) {
        var next = this[idx] ;
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : hub.isEqual(cur, value);
      }
      return ret ;  // return the invert
    },
    
    invoke: function(methodName) {
      var len = this.length ;
      if (len <= 0) return [] ; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [] ;
      var alen = arguments.length ;
      if (alen > 1) {
        for(idx=1;idx<alen;idx++) args.push(arguments[idx]) ;
      }

      // call invoke
      var ret = [] ;
      for(idx=0;idx<len;idx++) {
        var next = this[idx] ;
        var method = next ? next[methodName] : null ;
        if (method) ret[idx] = method.apply(next, args) ;
      }
      return ret ;
    },

    invokeWhile: function(targetValue, methodName) {
      var len = this.length ;
      if (len <= 0) return null ; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [] ;
      var alen = arguments.length ;
      if (alen > 2) {
        for(idx=2;idx<alen;idx++) args.push(arguments[idx]) ;
      }

      // call invoke
      var ret = targetValue ;
      for(idx=0;(ret === targetValue) && (idx<len);idx++) {
        var next = this[idx] ;
        var method = next ? next[methodName] : null ;
        if (method) ret = method.apply(next, args) ;
      }
      return ret ;
    },

    toArray: function() {
      var len = this.length ;
      if (len <= 0) return [] ; // nothing to invoke....

      // call invoke
      var ret = [] ;
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret.push(next) ;
      }
      return ret ;
    },
    
    getEach: function(key) {
      var ret = [];
      var len = this.length ;
      for(var idx=0;idx<len;idx++) {
        var obj = this[idx];
        ret[idx] = obj ? (obj.get ? obj.get(key) : obj[key]) : null;
      }
      return ret ;
    },
    
    setEach: function(key, value) {
      var len = this.length;
      for(var idx=0;idx<len;idx++) {
        var obj = this[idx];
        if (obj) {
          if (obj.set) {
            obj.set(key, value);
          } else obj[key] = value ;
        }
      }
      return this ;
    }
    
  }; 
  
  // These methods will only be applied if they are not already defined b/c 
  // the browser is probably getting it.
  var mixinIfMissing = {

    forEach: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        callback.call(target, next, idx, this);
      }
      return this ;
    },

    map: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret[idx] = callback.call(target, next, idx, this) ;
      }
      return ret ;
    },

    filter: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        if(callback.call(target, next, idx, this)) ret.push(next) ;
      }
      return ret ;
    },

    every: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = true;
      for(var idx=0;ret && (idx<len);idx++) {
        var next = this[idx] ;
        if(!callback.call(target, next, idx, this)) ret = false ;
      }
      return ret ;
    },

    some: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = false;
      for(var idx=0;(!ret) && (idx<len);idx++) {
        var next = this[idx] ;
        if(callback.call(target, next, idx, this)) ret = true ;
      }
      return ret ;
    },

    reduce: function(callback, initialValue, reducerProperty) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;

      // no value to return if no initial value & empty
      if (len===0 && initialValue === undefined) throw new TypeError();

      var ret  = initialValue;
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;

        // while ret is still undefined, just set the first value we get as 
        // ret. this is not the ideal behavior actually but it matches the 
        // FireFox implementation... :(
        if (next !== null) {
          if (ret === undefined) {
            ret = next ;
          } else {
            ret = callback.call(null, ret, next, idx, this, reducerProperty);
          }
        }
      }

      // uh oh...we never found a value!
      if (ret === undefined) throw new TypeError() ;
      return ret ;
    }   
  };
  
  // Apply methods if missing...
  for(var key in mixinIfMissing) {
    if (!mixinIfMissing.hasOwnProperty(key)) continue ;
    
    // The mixinIfMissing methods should be applied if they are not defined.
    // If Prototype 1.6 is included, some of these methods will be defined
    // already, but we want to override them anyway in this special case 
    // because our version is faster and functionally identitical.
    if (!Array.prototype[key] || ((typeof Prototype === 'object') && Prototype.Version.match(/^1\.6/))) {
      Array.prototype[key] = mixinIfMissing[key] ;
    }
  }
  
  // Apply other methods...
  hub.mixin(Array.prototype, alwaysMixin) ;
  
})();
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  A RangeObserver is used by Arrays to automatically observe all of the
  objects in a particular range on the array.  Whenever any property on one 
  of those objects changes, it will notify its delegate.  Likewise, whenever
  the contents of the array itself changes, it will notify its delegate and
  possibly update its own registration.
  
  This implementation uses only hub.Array methods.  It can be used on any 
  object that complies with hub.Array.  You may, however, choose to subclass
  this object in a way that is more optimized for your particular design.
  
  @class
*/
hub.RangeObserver = {

  /** 
    Walk like a duck.
    
    @property {Boolean}
  */
  isRangeObserver: true,
  
  /** @private */
  toString: function() { 
    var base = this.indexes ? this.indexes.toString() : "hub.IndexSet<..>" ;
    return base.replace('IndexSet', hub.fmt('RangeObserver(%@)', hub.guidFor(this))) ;
  },
  
  /**
    Creates a new range observer owned by the source.  The indexSet you pass
    must identify the indexes you are interested in observing.  The passed
    target/method will be invoked whenever the observed range changes.
    
    Note that changes to a range are buffered until the end of a run loop
    unless a property on the record itself changes.
  
    @param {hub.Array} source the source array
    @param {hub.IndexSet} indexSet set of indexes to observer
    @param {Object} target the target
    @param {Function|String} method the method to invoke
    @param {Object} context optional context to include in callback
    @param {Boolean} isDeep if true, observe property changes as well
    @returns {hub.RangeObserver} instance
  */
  create: function(source, indexSet, target, method, context, isDeep) {
    var ret = hub.beget(this);
    ret.source = source;
    ret.indexes = indexSet ? indexSet.frozenCopy() : null;
    ret.target = target;
    ret.method = method;
    ret.context = context ;
    ret.isDeep  = isDeep || false ;
    ret.beginObserving();
    return ret ;
  },

  /**
    Create subclasses for the RangeObserver.  Pass one or more attribute
    hashes.  Use this to create customized RangeObservers if needed for your 
    classes.
    
    @param {Hash} attrs one or more attribute hashes
    @returns {hub.RangeObserver} extended range observer class
  */
  extend: function(attrs) {
    var ret = hub.beget(this), args = arguments, len = args.length, idx;
    for(idx=0;idx<len;idx++) hub.mixin(ret, args[idx]);
    return ret ;
  },

  /**
    Destroys an active ranger observer, cleaning up first.
    
    @param {hub.Array} source the source array
    @returns {hub.RangeObserver} receiver
  */
  destroy: function(source) { 
    this.endObserving(); 
    return this; 
  },

  /**
    Updates the set of indexes the range observer applies to.  This will 
    stop observing the old objects for changes and start observing the 
    new objects instead.
    
    @param {hub.Array} source the source array
    @returns {hub.RangeObserver} receiver
  */
  update: function(source, indexSet) {
    if (this.indexes && this.indexes.isEqual(indexSet)) return this ;
    
    this.indexes = indexSet ? indexSet.frozenCopy() : null ;
    this.endObserving().beginObserving();
    return this;
  },
  
  /**
    Configures observing for each item in the current range.  Should update
    the observing array with the list of observed objects so they can be
    torn down later
    
    @returns {hub.RangeObserver} receiver
  */
  beginObserving: function() {
    if (!this.isDeep) return this; // nothing to do
    
    var observing = this.observing;
    if (!observing) observing = this.observing = hub.CoreSet.create();
    
    // cache iterator function to keep things fast
    var func = this._hub_beginObservingForEach;
    if (!func) {
      func = this._hub_beginObservingForEach = function(idx) {
        var obj = this.source.objectAt(idx);
        if (obj && obj.addObserver) {
          observing.push(obj);
          obj._hub_kvo_needsRangeObserver = true ;
        }
      };
    }
    this.indexes.forEach(func,this);

    // add to pending range observers queue so that if any of these objects
    // change we will have a chance to setup observing on them.
    this.isObserving = false ;
    hub.ObserverQueue.addPendingRangeObserver(this);

    return this;
  },
  
  /** @private
    Called when an object that appears to need range observers has changed.
    Check to see if the range observer contains this object in its list.  If
    it does, go ahead and setup observers on all objects and remove ourself
    from the queue.
  */
  setupPending: function(object) {
    var observing = this.observing ;

    if (this.isObserving || !observing || (observing.get('length')===0)) {
      return true ;
    } 
    
    if (observing.contains(object)) {
      this.isObserving = true ;

      // cache iterator function to keep things fast
      var func = this._hub_setupPendingForEach;
      if (!func) {
        var source = this.source,
            method = this.objectPropertyDidChange;

        func = this._hub_setupPendingForEach = function(idx) {
          var obj = this.source.objectAt(idx),
              guid = hub.guidFor(obj),
              key ;
              
          if (obj && obj.addObserver) {
            observing.push(obj);
            obj.addObserver('*', this, method);
            
            // also save idx of object on range observer itself.  If there is
            // more than one idx, convert to IndexSet.
            key = this[guid];
            if (key === undefined || key === null) {
              this[guid] = idx ;
            } else if (key.isIndexSet) {
              key.add(idx);
            } else {
              key = this[guid] = hub.IndexSet.create(key).add(idx);
            }
            
          }
        };
      }
      this.indexes.forEach(func,this);
      return true ;
      
    } else return false ;
  },
  
  /**
    Remove observers for any objects currently begin observed.  This is 
    called whenever the observed range changes due to an array change or 
    due to destroying the observer.
    
    @returns {hub.RangeObserver} receiver
  */
  endObserving: function() {
    if (!this.isDeep) return this; // nothing to do
    
    var observing = this.observing;
    
    if (this.isObserving) {
      var meth      = this.objectPropertyDidChange,
          source    = this.source,
          idx, lim, obj;

      if (observing) {
        lim = observing.length;
        for(idx=0;idx<lim;idx++) {
          obj = observing[idx];
          obj.removeObserver('*', this, meth);
          this[hub.guidFor(obj)] = null;
        }
        observing.length = 0 ; // reset
      } 
      
      this.isObserving = false ;
    }
    
    if (observing) observing.clear(); // empty set.
    return this ;
  },
  
  /**
    Whenever the actual objects in the range changes, notify the delegate
    then begin observing again.  Usually this method will be passed an 
    IndexSet with the changed indexes.  The range observer will only notify
    its delegate if the changed indexes include some of all of the indexes
    this range observer is monitoring.
    
    @param {hub.IndexSet} changes optional set of changed indexes
    @returns {hub.RangeObserver} receiver
  */
  rangeDidChange: function(changes) {
    var indexes = this.indexes;
    if (!changes || !indexes || indexes.intersects(changes)) {
      this.endObserving(); // remove old observers
      this.method.call(this.target, this.source, null, '[]', changes, this.context);
      this.beginObserving(); // setup new ones
    }
    return this ;
  },

  /**
    Whenever an object changes, notify the delegate
    
    @param {Object} the object that changed
    @param {String} key the property that changed
    @returns {hub.RangeObserver} receiver
  */
  objectPropertyDidChange: function(object, key, value, rev) {
    var context = this.context,
        method  = this.method, 
        guid    = hub.guidFor(object),
        index   = this[guid];
      
    // lazily convert index to IndexSet.  
    if (index && !index.isIndexSet) {
      index = this[guid] = hub.IndexSet.create(index).freeze();
    }
    
    if (context) {
      method.call(this.target, this.source, object, key, index, context, rev);
    } else {
      method.call(this.target, this.source, object, key, index, rev);
    }
  }
  
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

hub.OUT_OF_RANGE_EXCEPTION = "Index out of range." ;

/**
  This mixin implements Observer-friendly Array-like behavior.  hub.Array is 
  picked up by the Array class as well as other controllers, etc. that want to  
  appear to be arrays.
  
  Unlike hub.Enumerable, this mixin defines methods specifically for 
  collections that provide index-ordered access to their contents.  When you
  are designing code that needs to accept any kind of Array-like object, you
  should use these methods instead of Array primitives because these will 
  properly notify observers of changes to the array.
  
  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the 
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as sparse arrays, record arrays, and array controllers.
  
  You can use the methods defined in this module to access and modify array 
  content in a KVO-friendly way.  You can also be notified whenever the 
  membership of an array changes by changing the syntax of the property to
  .observes('*myProperty.[]').
  
  NOTE: The leading '*' is required for correct observer notifications.
  
  To support hub.Array in your own class, you must override and implement the 
  two primitive methods: replace() and objectAt().
  
  NOTE: The hub.Array mixin also incorporates the hub.Enumerable mixin.  All 
  hub.Array-like objects are also enumerable.
  
  @mixin
  @extends hub.Enumerable
*/
hub.Array = {
  
  /**
    Walk like a duck - use isHubArray to avoid conflicts.
  */
  isHubArray: true,
  
  /**
    @field {Number} length
    
    Your array must support the length property.  Your replace methods should
    set this property whenever it changes.
  */
  // length: 0,
  
  /**
    This is one of the primitves you must implement to support hub.Array.  You 
    should replace amt objects started at idx with the objects in the passed 
    array.  You should also call this.enumerableContentDidChange() ;
    
    @param {Number} idx 
      Starting index in the array to replace.  If idx >= length, then append to 
      the end of the array.
      
    @param {Number} amt 
      Number of elements that should be removed from the array, starting at 
      *idx*.
      
    @param {Array} objects 
      An array of zero or more objects that should be inserted into the array at 
      *idx* 
  */
  replace: function(idx, amt, objects) {
    throw "replace() must be implemented to conform to hub.Array" ;
  },
  
  /**
    This is one of the primitives you must implement to support hub.Array.  
    Returns the object at the named index.  If your object supports retrieving 
    the value of an array item using get() (i.e. myArray.get(0)), then you do
    not need to implement this method yourself.
    
    @param {Number} idx
      The index of the item to return.  If idx exceeds the current length, 
      return null.
  */
  objectAt: function(idx) {
    if (idx < 0) return undefined ;
    if (idx >= this.get('length')) return undefined;
    return this.get(idx);
  },
  
  /**
    @field []
    
    This is the handler for the special array content property.  If you get
    this property, it will return this.  If you set this property it a new 
    array, it will replace the current content.
    
    This property overrides the default property defined in hub.Enumerable.
  */
  '[]': function(key, value) {
    if (value !== undefined) {
      this.replace(0, this.get('length'), value) ;
    }  
    return this ;
  }.property(),
  
  /**
    This will use the primitive replace() method to insert an object at the 
    specified index.
    
    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
  */
  insertAt: function(idx, object) {
    if (idx > this.get('length')) throw hub.OUT_OF_RANGE_EXCEPTION ;
    this.replace(idx,0,[object]) ;
    return this ;
  },
  
  /**
    Remove an object at the specified index using the replace() primitive 
    method.  You can pass either a single index, a start and a length or an
    index set.
    
    If you pass a single index or a start and length that is beyond the 
    length this method will throw an hub.OUT_OF_RANGE_EXCEPTION
    
    @param {Number|hub.IndexSet} start index, start of range, or index set
    @param {Number} length length of passing range
    @returns {Object} receiver
  */
  removeAt: function(start, length) {
    
    var delta = 0, // used to shift range
        empty = [];
    
    if (typeof start === hub.T_NUMBER) {
      
      if ((start < 0) || (start >= this.get('length'))) {
        throw hub.OUT_OF_RANGE_EXCEPTION;
      }
      
      // fast case
      if (length === undefined) {
        this.replace(start,1,empty);
        return this ;
      } else {
        start = hub.IndexSet.create(start, length);
      }
    }
    
    this.beginPropertyChanges();
    start.forEachRange(function(start, length) {
      start -= delta ;
      delta += length ;
      this.replace(start, length, empty); // remove!
    }, this);
    this.endPropertyChanges();
    
    return this ;
  },
    
  /**
    Search the array of this object, removing any occurrences of it.
    @param {object} obj object to remove
  */
  removeObject: function(obj) {
    var loc = this.get('length') || 0;
    while(--loc >= 0) {
      var curObject = this.objectAt(loc) ;
      if (curObject == obj) this.removeAt(loc) ;
    }
    return this ;
  },
  
  /**
    Search the array for the passed set of objects and remove any occurrences
    of the. 
    
    @param {hub.Enumerable} objects the objects to remove
    @returns {hub.Array} receiver
  */
  removeObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.removeObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },
  
  /**
    Push the object onto the end of the array.  Works just like push() but it 
    is KVO-compliant.
  */
  pushObject: function(obj) {
    this.insertAt(this.get('length'), obj) ;
    return obj ;
  },
  
  
  /**
    Add the objects in the passed numerable to the end of the array.  Defers
    notifying observers of the change until all objects are added.
    
    @param {hub.Enumerable} objects the objects to add
    @returns {hub.Array} receiver
  */
  pushObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.pushObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },

  /**
    Pop object from array or nil if none are left.  Works just like pop() but 
    it is KVO-compliant.
  */
  popObject: function() {
    var len = this.get('length') ;
    if (len === 0) return null ;
    
    var ret = this.objectAt(len-1) ;
    this.removeAt(len-1) ;
    return ret ;
  },
  
  /**
    Shift an object from start of array or nil if none are left.  Works just 
    like shift() but it is KVO-compliant.
  */
  shiftObject: function() {
    if (this.get('length') === 0) return null ;
    var ret = this.objectAt(0) ;
    this.removeAt(0) ;
    return ret ;
  },
  
  /**
    Unshift an object to start of array.  Works just like unshift() but it is 
    KVO-compliant.
  */
  unshiftObject: function(obj) {
    this.insertAt(0, obj) ;
    return obj ;
  },

  
  /**
    Adds the named objects to the beginning of the array.  Defers notifying
    observers until all objects have been added.
    
    @param {hub.Enumerable} objects the objects to add
    @returns {hub.Array} receiver
  */
  unshiftObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.unshiftObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },
  
  /**  
    Compares each item in the array.  Returns true if they are equal.
  */
  isEqual: function(ary) {
    if (!ary) return false ;
    if (ary == this) return true;
    
    var loc = ary.get('length') ;
    if (loc != this.get('length')) return false ;

    while(--loc >= 0) {
      if (!hub.isEqual(ary.objectAt(loc), this.objectAt(loc))) return false ;
    }
    return true ;
  },
  
  /**
    Generates a new array with the contents of the old array, sans any null
    values.
    
    @returns {Array}
  */
  compact: function() { return this.without(null); },
  
  /**
    Generates a new array with the contents of the old array, sans the passed
    value.
    
    @param {Object} value
    @returns {Array}
  */
  without: function(value) {
    if (this.indexOf(value)<0) return this; // value not present.
    var ret = [] ;
    this.forEach(function(k) { 
      if (k !== value) ret[ret.length] = k; 
    }) ;
    return ret ;
  },

  /**
    Generates a new array with only unique values from the contents of the
    old array.
    
    @returns {Array}
  */
  uniq: function() {
    var ret = [] ;
    this.forEach(function(k){
      if (ret.indexOf(k)<0) ret[ret.length] = k;
    });
    return ret ;
  },
  
  rangeObserverClass: hub.RangeObserver,
  
  /**
    Creates a new range observer on the receiver.  The target/method callback
    you provide will be invoked anytime any property on the objects in the 
    specified range changes.  It will also be invoked if the objects in the
    range itself changes also.
    
    The callback for a range observer should have the signature:
    
    {{{
      function rangePropertyDidChange(array, objects, key, indexes, conext)
    }}}
    
    If the passed key is '[]' it means that the object itself changed.
    
    The return value from this method is an opaque reference to the 
    range observer object.  You can use this reference to destroy the 
    range observer when you are done with it or to update its range.
    
    @param {hub.IndexSet} indexes indexes to observe
    @param {Object} target object to invoke on change
    @param {String|Function} method the method to invoke
    @param {Object} context optional context
    @returns {hub.RangeObserver} range observer
  */
  addRangeObserver: function(indexes, target, method, context) {
    var rangeob = this._hub_array_rangeObservers;
    if (!rangeob) rangeob = this._hub_array_rangeObservers = hub.CoreSet.create() ;

    // The first time a range observer is added, cache the current length so
    // we can properly notify observers the first time through
    if (this._hub_array_oldLength===undefined) {
      this._hub_array_oldLength = this.get('length') ;
    }
    
    var C = this.rangeObserverClass ;
    var isDeep = false; //disable this feature for now
    var ret = C.create(this, indexes, target, method, context, isDeep) ;
    rangeob.add(ret);
    
    // first time a range observer is added, begin observing the [] property
    if (!this._hub_array_isNotifyingRangeObservers) {
      this._hub_array_isNotifyingRangeObservers = true ;
      this.addObserver('[]', this, this._hub_array_notifyRangeObservers);
    }
    
    return ret ;
  },
  
  /**
    Moves a range observer so that it observes a new range of objects on the 
    array.  You must have an existing range observer object from a call to
    addRangeObserver().
    
    The return value should replace the old range observer object that you
    pass in.
    
    @param {hub.RangeObserver} rangeObserver the range observer
    @param {hub.IndexSet} indexes new indexes to observe
    @returns {hub.RangeObserver} the range observer (or a new one)
  */
  updateRangeObserver: function(rangeObserver, indexes) {
    return rangeObserver.update(this, indexes);
  },

  /**
    Removes a range observer from the receiver.  The range observer must
    already be active on the array.
    
    The return value should replace the old range observer object.  It will
    usually be null.
    
    @param {hub.RangeObserver} rangeObserver the range observer
    @returns {hub.RangeObserver} updated range observer or null
  */
  removeRangeObserver: function(rangeObserver) {
    var ret = rangeObserver.destroy(this);
    var rangeob = this._hub_array_rangeObservers;
    if (rangeob) rangeob.remove(rangeObserver) ; // clear
    return ret ;
  },
  
  /**
    Updates observers with content change.  To support range observers, 
    you must pass three change parameters to this method.  Otherwise this
    method will assume the entire range has changed.
    
    This also assumes you have already updated the length property.
    @param {Number} start the starting index of the change
    @param {Number} amt the final range of objects changed
    @param {Number} delta if you added or removed objects, the delta change
    @returns {hub.Array} receiver
  */
  enumerableContentDidChange: function(start, amt, delta) {
    var rangeob = this._hub_array_rangeObservers, 
        oldlen  = this._hub_array_oldLength,
        newlen, length, changes ;

    this.beginPropertyChanges();    
    this.notifyPropertyChange('length'); // flush caches

    // schedule info for range observers
    if (rangeob && rangeob.length>0) {

      // if no oldLength has been cached, just assume 0
      if (oldlen === undefined) oldlen = 0;    
      this._hub_array_oldLength = newlen = this.get('length');
      
      // normalize input parameters
      // if delta was not passed, assume it is the different between the 
      // new and old length.
      if (start === undefined) start = 0;
      if (delta === undefined) delta = newlen - oldlen ;
      if (delta !== 0 || amt === undefined) {
        length = newlen - start ;
        if (delta<0) length -= delta; // cover removed range as well
      } else {
        length = amt ;
      }
      
      changes = this._hub_array_rangeChanges;
      if (!changes) changes = this._hub_array_rangeChanges = hub.IndexSet.create();
      changes.add(start, length);
    }
    
    this.notifyPropertyChange('[]') ;
    this.endPropertyChanges();
    
    return this ;
  },
  
  /**  @private
    Observer fires whenever the '[]' property changes.  If there are 
    range observers, will notify observers of change.
  */
  _hub_array_notifyRangeObservers: function() {
    var rangeob = this._hub_array_rangeObservers,
        changes = this._hub_array_rangeChanges,
        len     = rangeob ? rangeob.length : 0, 
        idx, cur;
        
    if (len > 0 && changes && changes.length > 0) {
      for(idx=0;idx<len;idx++) rangeob[idx].rangeDidChange(changes);
      changes.clear(); // reset for later notifications
    }
  }
  
} ;

// Add hub.Array to the built-in array before we add hub.Enumerable to 
// hub.Array since built-in Array's are already enumerable.
hub.mixin(Array.prototype, hub.Array) ; 
hub.Array = hub.mixin({}, hub.Enumerable, hub.Array) ;

// Add any extra methods to hub.Array that are native to the built-in Array.
/**
  Returns a new array that is a slice of the receiver.  This implementation
  uses the observable array methods to retrieve the objects for the new 
  slice.
  
  @param beginIndex {Integer} (Optional) index to begin slicing from.     
  @param endIndex {Integer} (Optional) index to end the slice at.
  @returns {Array} New array with specified slice
*/
hub.Array.slice = function(beginIndex, endIndex) {
  var ret = []; 
  var length = this.get('length') ;
  if (hub.none(beginIndex)) beginIndex = 0 ;
  if (hub.none(endIndex) || (endIndex > length)) endIndex = length ;
  while(beginIndex < endIndex) ret[ret.length] = this.objectAt(beginIndex++) ;
  return ret ;
}  ;

/**
  Returns the index for a particular object in the index.
  
  @param {Object} object the item to search for
  @param {NUmber} startAt optional starting location to search, default 0
  @returns {Number} index of -1 if not found
*/
hub.Array.indexOf = function(object, startAt) {
  var idx, len = this.get('length');
  
  if (startAt === undefined) startAt = 0;
  else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
  if (startAt < 0) startAt += len;
  
  for(idx=startAt;idx<len;idx++) {
    if (this.objectAt(idx) === object) return idx ;
  }
  return -1;
};

// Some browsers do not support indexOf natively.  Patch if needed
if (!Array.prototype.indexOf) Array.prototype.indexOf = hub.Array.indexOf;

/**
  Returns the last index for a particular object in the index.
  
  @param {Object} object the item to search for
  @param {NUmber} startAt optional starting location to search, default 0
  @returns {Number} index of -1 if not found
*/
hub.Array.lastIndexOf = function(object, startAt) {
  var idx, len = this.get('length');
  
  if (startAt === undefined) startAt = len-1;
  else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
  if (startAt < 0) startAt += len;
  
  for(idx=startAt;idx>=0;idx--) {
    if (this.objectAt(idx) === object) return idx ;
  }
  return -1;
};

// Some browsers do not support lastIndexOf natively.  Patch if needed
if (!Array.prototype.lastIndexOf) {
  Array.prototype.lastIndexOf = hub.Array.lastIndexOf;
}

// ......................................................
// ARRAY SUPPORT
//
// Implement the same enhancements on Array.  We use specialized methods
// because working with arrays are so common.
(function() {
  hub.mixin(Array.prototype, {
    
    // primitive for array support.
    replace: function(idx, amt, objects) {
      if (this.isFrozen) throw hub.FROZEN_ERROR ;
      if (!objects || objects.length === 0) {
        this.splice(idx, amt) ;
      } else {
        var args = [idx, amt].concat(objects) ;
        this.splice.apply(this,args) ;
      }
      
      // if we replaced exactly the same number of items, then pass only the
      // replaced range.  Otherwise, pass the full remaining array length 
      // since everything has shifted
      var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;
      this.enumerableContentDidChange(idx, amt, len - amt) ;
      return this ;
    },
    
    // If you ask for an unknown property, then try to collect the value
    // from member items.
    unknownProperty: function(key, value) {
      var ret = this.reducedProperty(key, value) ;
      if ((value !== undefined) && ret === undefined) {
        ret = this[key] = value;
      }
      return ret ;
    }
    
  });
    
  // If browser did not implement indexOf natively, then override with
  // specialized version
  var indexOf = Array.prototype.indexOf;
  if (!indexOf || (indexOf === hub.Array.indexOf)) {
    Array.prototype.indexOf = function(object, startAt) {
      var idx, len = this.length;
      
      if (startAt === undefined) startAt = 0;
      else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
      if (startAt < 0) startAt += len;
      
      for(idx=startAt;idx<len;idx++) {
        if (this[idx] === object) return idx ;
      }
      return -1;
    } ; 
  }
  
  var lastIndexOf = Array.prototype.lastIndexOf ;
  if (!lastIndexOf || (lastIndexOf === hub.Array.lastIndexOf)) {
    Array.prototype.lastIndexOf = function(object, startAt) {
      var idx, len = this.length;
      
      if (startAt === undefined) startAt = len-1;
      else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
      if (startAt < 0) startAt += len;
      
      for(idx=startAt;idx>=0;idx--) {
        if (this[idx] === object) return idx ;
      }
      return -1;
    };
  }
  
})();
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  Impelements some standard methods for copying an object.  Add this mixin to
  any object you create that can create a copy of itself.  This mixin is 
  added automatically to the built-in array.
  
  You should generally implement the copy() method to return a copy of the 
  receiver.
  
  NOTE: frozenCopy() will only work if you also implement hub.Freezable.
  
  @mixin
*/
hub.Copyable = {
  
  /**
    Walk like a duck.  Indicates that the object can be copied.
    
    @type Boolean
  */
  isCopyable: true,
  
  /**
    Override to return a copy of the receiver.  Default implementation raises
    an exception.
    
    @returns {Object} copy of receiver
  */
  copy: function() {
    throw "%@.copy() is not implemented";
  },
  
  /**
    If the object implements hub.Freezable, then this will return a new copy 
    if the object is not frozen and the receiver if the object is frozen.  
    
    Raises an exception if you try to call this method on a object that does
    not support freezing.
    
    You should use this method whenever you want a copy of a freezable object
    since a freezable object can simply return itself without actually 
    consuming more memory.
  
    @returns {Object} copy of receiver or receiver
  */
  frozenCopy: function() {
    var isFrozen = this.get ? this.get('isFrozen') : this.isFrozen ;
    if (isFrozen === true) return this ;
    else if (isFrozen === undefined) {
      throw hub.fmt("%@ does not support freezing", this) ;
    } else return this.copy().freeze();
  }
};

// Make Array copyable
hub.mixin(Array.prototype, hub.Copyable);
Array.prototype.copy = Array.prototype.slice;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  Support methods for the Delegate design pattern.
  
  The Delegate design pattern makes it easy to delegate a portion of your 
  application logic to another object.  This is most often used in views to 
  delegate various application-logic decisions to controllers in order to 
  avoid having to bake application-logic directly into the view itself.
  
  The methods provided by this mixin make it easier to implement this pattern
  but they are not required to support delegates.
  
  h2. The Pattern
  
  The delegate design pattern typically means that you provide a property,
  usually ending in "delegate", that can be set to another object in the 
  system.  
  
  When events occur or logic decisions need to be made that you would prefer
  to delegate, you can call methods on the delegate if it is set.  If the 
  delegate is not set, you should provide some default functionality instead.
  
  Note that typically delegates are not observable, hence it is not necessary
  to use get() to retrieve the value of the delegate.
  
  @mixin
*/
hub.DelegateSupport = {  
  
  /**
    Selects the delegate that implements the specified method name.  Pass one
    or more delegates.  The receiver is automatically included as a default.
    
    This can be more efficient than using invokeDelegateMethod() which has
    to marshall arguments into a delegate call.
    
    @param {String} methodName
    @param {Object...} delegate one or more delegate arguments
    @returns {Object} delegate or null
  */
  delegateFor: function(methodName) {
    var idx = 1,
        len = arguments.length,
        ret ;
        
    while(idx<len) {
      ret = arguments[idx];
      if (ret && ret[methodName] !== undefined) return ret ;
      idx++;      
    }
    
    return (this[methodName] !== undefined) ? this : null;
  },
  
  /**
    Invokes the named method on the delegate that you pass.  If no delegate
    is defined or if the delegate does not implement the method, then a 
    method of the same name on the receiver will be called instead.  
    
    You can pass any arguments you want to pass onto the delegate after the
    delegate and methodName.
    
    @param {Object} delegate a delegate object.  May be null.
    @param {String} methodName a method name
    @param {Object...} args (OPTIONAL) any additional arguments
    
    @returns {Object} value returned by delegate
  */
  invokeDelegateMethod: function(delegate, methodName, args) {
    args = hub.A(arguments); args = args.slice(2, args.length) ;
    if (!delegate || !delegate[methodName]) delegate = this ;
    
    var method = delegate[methodName];
    return method ? method.apply(delegate, args) : null;
  },
  
  /**
    Search the named delegates for the passed property.  If one is found, 
    gets the property value and returns it.  If none of the passed delegates 
    implement the property, search the receiver for the property as well.
    
    @param {String} key the property to get.
    @param {Object} delegate one or more delegate
    @returns {Object} property value or undefined
  */
  getDelegateProperty: function(key, delegate) {
    var idx = 1,
        len = arguments.length,
        ret ;
        
    while(idx<len) {
      ret = arguments[idx++];
      if (ret && ret[key] !== undefined) {
        return ret.get ? ret.get(key) : ret[key] ;
      }
    }
    
    return (this[key] !== undefined) ? this.get(key) : undefined ;
  }
  
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  Standard Error that should be raised when you try to modify a frozen object.
  
  @property {Error}
*/
hub.FROZEN_ERROR = new Error("Cannot modify a frozen object");

/** 
  The hub.Freezable mixin implements some basic methods for marking an object
  as frozen.  Once an object is frozen it should be read only.  No changes 
  may be made the internal state of the object.
  
  h2. Enforcement

  To fully support freezing in your subclass, you must include this mixin and
  override any method that might alter any property on the object to instead
  raise an exception.  You can check the state of an object by checking the
  isFrozen property.

  Although future versions of JavaScript may support language-level freezing
  of objects, that is not the case today.  Even if an object is freezable, it 
  is still technically possible to modify the object, even though it could
  break other parts of your application that do not expect a frozen object to
  change.  It is, therefore, very important that you always respect the 
  isFrozen property on all freezable objects.
  
  h2. Example

  The example below shows a simple object that implement the hub.Freezable 
  mixin.
  
  {{{
    Contact = hub.Object.extend(hub.Freezable, {
      
      firstName: null,
      
      lastName: null,
      
      // swaps the names
      swapNames: function() {
        if (this.get('isFrozen')) throw hub.FROZEN_ERROR;
        var tmp = this.get('firstName');
        this.set('firstName', this.get('lastName'));
        this.set('lastName', tmp);
        return this;
      }
      
    });
    
    c = Context.create({ firstName: "John", lastName: "Doe" });
    c.swapNames();  => returns c
    c.freeze();
    c.swapNames();  => EXCEPTION
    
  }}}
  
  h2. Copying
  
  Usually the hub.Freezable mixin is implemented in cooperation with the
  hub.Copyable mixin, which defines a frozenCopy() method that will return
  a frozen object, if the object implements this method as well.
  
  @mixin
*/
hub.Freezable = {
  
  /**
    Walk like a duck.
    
    @property {Boolean}
  */
  isFreezable: true,
  
  /**
    Set to true when the object is frozen.  Use this property to detect whether
    your object is frozen or not.
    
    @property {Boolean}
  */
  isFrozen: false,
  
  /**
    Freezes the object.  Once this method has been called the object should
    no longer allow any properties to be edited.
    
    @returns {Object} reciever
  */
  freeze: function() {
    // NOTE: Once someone actually implements Object.freeze() in the browser,
    // add a call to that here also.
    
    if (this.set) this.set('isFrozen', true);
    else this.isFrozen = true;
    return this;
  }
};

// Add to Array
hub.mixin(Array.prototype, hub.Freezable);
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

// IMPORTANT NOTE:  This file actually defines two classes: 
// hub.Set is a fully observable set class documented below. 
// hub.CoreSet is just like hub.Set but is not observable.  This is required
// because hub.Observable is built on using sets and requires sets without 
// observability.
//
// We use pointer swizzling below to swap around the actual definitions so 
// that the documentation will turn out right.  (The docs should only 
// define hub.Set - not hub.CoreSet.)

/**
  An unordered collection of objects.

  A Set works a bit like an array except that its items are not ordered.  
  You can create a set to efficiently test for membership for an object. You 
  can also iterate through a set just like an array, even accessing objects
  by index, however there is no gaurantee as to their order.

  Note that hub.Set is a primitive object, like an array.  It does implement
  limited key-value observing support but it does not extend from hub.Object
  so you should not subclass it.

  h1. Creating a Set

  You can create a set like you would most objects using hub.Set.create().  
  Most new sets you create will be empty, but you can also initialize the set 
  with some content by passing an array or other enumerable of objects to the 
  constructor.

  Finally, you can pass in an existing set and the set will be copied.  You
  can also create a copy of a set by calling hub.Set#clone().

  {{{
    // creates a new empty set
    var foundNames = hub.Set.create();

    // creates a set with four names in it.
    var names = hub.Set.create(["Charles", "Peter", "Chris", "Erich"]) ;

    // creates a copy of the names set.
    var namesCopy = hub.Set.create(names);

    // same as above.
    var anotherNamesCopy = names.clone();
  }}}

  h1. Adding/Removing Objects

  You generally add or removed objects from a set using add() or remove().
  You can add any type of object including primitives such as numbers,
  strings, and booleans.

  Note that objects can only exist one time in a set.  If you call add() on
  a set with the same object multiple times, the object will only be added 
  once.  Likewise, calling remove() with the same object multiple times will
  remove the object the first time and have no effect on future calls until 
  you add the object to the set again.

  Note that you cannot add/remove null or undefined to a set.  Any attempt to
  do so will be ignored.  

  In addition to add/remove you can also call push()/pop().  Push behaves just
  like add() but pop(), unlike remove() will pick an arbitrary object, remove
  it and return it.  This is a good way to use a set as a job queue when you
  don't care which order the jobs are executed in.

  h1. Testing for an Object

  To test for an object's presence in a set you simply call hub.Set#contains().
  This method tests for the object's hash, which is generally the same as the
  object's _guid but if you implement the hash() method on the object, it will
  use the return value from that method instead.

  @class
  @extends hub.Enumerable 
  @extends hub.Observable
  @extends hub.Copyable
  @extends hub.Freezable
*/
hub.Set = hub.mixin({},
  hub.Enumerable, hub.Observable, hub.Copyable, hub.Freezable,
/** @scope hub.Set.prototype */ {

  /** 
    Creates a new set, with the optional array of items included in the 
    return set.

    @param {hub.Enumerable} items items to add
    @return {hub.Set}
  */
  create: function(items) {
    var ret, idx, pool = hub.Set._hub_pool, isObservable = this.isObservable;
    if (!isObservable && items===undefined && pool.length>0) ret = pool.pop();
    else {
      ret = hub.beget(this);
      if (isObservable) ret.initObservable();
      
      if (items && items.isEnumerable && items.get('length')>0) {

        ret.isObservable = false; // suspend change notifications
        
        // arrays and sets get special treatment to make them a bit faster
        if (items.isHubArray) {
          idx = items.get ? items.get('length') : items.length;
          while(--idx>=0) ret.add(items.objectAt(idx));
        
        } else if (items.isSet) {
          idx = items.length;
          while(--idx>=0) ret.add(items[idx]);
          
        // otherwise use standard hub.Enumerable API
        } else items.forEach(function(i) { ret.add(i); }, this);
        
        ret.isObservable = isObservable;
      }
    }
    return ret ;
  },
  
  /**
    Walk like a duck
    
    @property {Boolean}
  */
  isSet: true,
  
  /**
    This property will change as the number of objects in the set changes.

    @property {Number}
  */
  length: 0,

  /**
    Returns the first object in the set or null if the set is empty
    
    @property {Object}
  */
  firstObject: function() {
    return (this.length>0) ? this[0] : undefined ;
  }.property(),
  
  /**
    Clears the set 
    
    @returns {hub.Set}
  */
  clear: function() { 
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    this.length = 0;
    return this ;
  },

  /**
    Call this method to test for membership.
    
    @returns {Boolean}
  */
  contains: function(obj) {

    // because of the way a set is "reset", the guid for an object may 
    // still be stored as a key, but points to an index that is beyond the
    // length.  Therefore the found idx must both be defined and less than
    // the current length.
    if (obj === null) return false ;
    var idx = this[hub.hashFor(obj)] ;
    return (!hub.none(idx) && (idx < this.length) && (this[idx]===obj)) ;
  },
  
  /**
    Returns true if the passed object is also a set that contains the same 
    objects as the receiver.
  
    @param {hub.Set} obj the other object
    @returns {Boolean}
  */
  isEqual: function(obj) {
    // fail fast
    if (!obj || !obj.isSet || (obj.get('length') !== this.get('length'))) {
      return false ;
    }
    
    var loc = this.get('length');
    while(--loc>=0) {
      if (!obj.contains(this[loc])) return false ;
    }
    
    return true;
  },

  /**
    Call this method to add an object. performs a basic add.

    If the object is already in the set it will not be added again.

    @param obj {Object} the object to add
    @returns {hub.Set} receiver
  */
  add: function(obj) {
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    
    // cannot add null to a set.
    if (obj===null || obj===undefined) return this; 

    var guid = hub.hashFor(obj) ;
    var idx = this[guid] ;
    var len = this.length ;
    if ((idx===null || idx===undefined) || (idx >= len) || (this[idx]!==obj)){
      this[len] = obj ;
      this[guid] = len ;
      this.length = len+1;
    }
    
    if (this.isObservable) this.enumerableContentDidChange();
    
    return this ;
  },

  /**
    Add all the items in the passed array or enumerable

    @returns {hub.Set} receiver
  */
  addEach: function(objects) {
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    if (!objects || !objects.isEnumerable) {
      throw hub.fmt("%@.addEach must pass enumerable", this);
    }

    var idx, isObservable = this.isObservable ;
    
    if (isObservable) this.beginPropertyChanges();
    if (objects.isHubArray) {
      idx = objects.get('length');
      while(--idx >= 0) this.add(objects.objectAt(idx)) ;
    } else if (objects.isSet) {
      idx = objects.length;
      while(--idx>=0) this.add(objects[idx]);
      
    } else objects.forEach(function(i) { this.add(i); }, this);
    if (isObservable) this.endPropertyChanges();
    
    return this ;
  },  

  /**
    Removes the object from the set if it is found.

    If the object is not in the set, nothing will be changed.

    @param obj {Object} the object to remove
    @returns {hub.Set} receiver
  */  
  remove: function(obj) {
    if (this.isFrozen) throw hub.FROZEN_ERROR;

    if (hub.none(obj)) return this ;
    var guid = hub.hashFor(obj);
    var idx = this[guid] ;
    var len = this.length;

    // not in set.
    if (hub.none(idx) || (idx >= len) || (this[idx] !== obj)) return this; 

    // clear the guid key
    delete this[guid] ;

    // to clear the index, we will swap the object stored in the last index.
    // if this is the last object, just reduce the length.
    if (idx < (len-1)) {
      obj = this[idx] = this[len-1];
      this[hub.hashFor(obj)] = idx ;
    }

    // reduce the length
    this.length = len-1;
    if (this.isObservable) this.enumerableContentDidChange();
    return this ;
  },

  /**
    Removes an arbitrary object from the set and returns it.

    @returns {Object} an object from the set or null
  */
  pop: function() {
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    var obj = (this.length > 0) ? this[this.length-1] : null ;
    if (obj) this.remove(obj) ;
    return obj ;
  },

  /**
    Removes all the items in the passed array.

    @returns {hub.Set} receiver
  */
  removeEach: function(objects) {
    if (this.isFrozen) throw hub.FROZEN_ERROR ;
    if (!objects || !objects.isEnumerable) {
      throw hub.fmt("%@.addEach must pass enumerable", this) ;
    }
    
    var idx, isObservable = this.isObservable ;
    
    if (isObservable) this.beginPropertyChanges();
    if (objects.isHubArray) {
      idx = objects.get('length');
      while(--idx >= 0) this.remove(objects.objectAt(idx)) ;
    } else if (objects.isSet) {
      idx = objects.length;
      while(--idx>=0) this.remove(objects[idx]);
    } else objects.forEach(function(i) { this.remove(i); }, this);
    if (isObservable) this.endPropertyChanges();
    
    return this ;
  },
  
  /**
    Clones the set into a new set.
    
    @returns {hub.Set} new copy
  */
  copy: function() { return this.constructor.create(this); },
  
  /**
    Return a set to the pool for reallocation.
    
    @returns {hub.Set} receiver
  */
  destroy: function() {
    this.isFrozen = false ; // unfreeze to return to pool
    if (!this.isObservable) hub.Set._hub_pool.push(this.clear()) ;
    return this ;
  },
  
  // .......................................
  // PRIVATE 
  //

  /** @private - optimized */
  forEach: function(iterator, target) {
    var len = this.length;
    if (!target) target = this ;
    for(var idx=0;idx<len;idx++) iterator.call(target, this[idx], idx, this);
    return this ;
  },

  /** @private */
  toString: function() {
    var len = this.length, idx, ary = [];
    for(idx=0;idx<len;idx++) ary[idx] = this[idx];
    return hub.fmt("hub.Set<%@>", ary.join(',')) ;
  },
  
  // the pool used for non-observable sets
  _hub_pool: [],

  /** @private */
  isObservable: true

}) ;

hub.Set.constructor = hub.Set;

// Make hub.Set look a bit more like other enumerables

/** @private */
hub.Set.clone = hub.Set.copy ;

/** @private */
hub.Set.push = hub.Set.unshift = hub.Set.add ;

/** @private */
hub.Set.shift = hub.Set.pop ;

// add generic add/remove enumerable support

/** @private */
hub.Set.addObject = hub.Set.add ;

/** @private */
hub.Set.removeObject = hub.Set.remove;

hub.Set._hub_pool = [];

// ..........................................................
// CORE SET
// 

/**
  CoreSet is just like set but not observable.  If you want to use the set 
  as a simple data structure with no observing, CoreSet is slightly faster
  and more memory efficient.
  
  @class
  @extends hub.Set
*/
hub.CoreSet = hub.beget(hub.Set);

/** @private */
hub.CoreSet.isObservable = false ;

/** @private */
hub.CoreSet.constructor = hub.CoreSet;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

hub.BENCHMARK_OBJECTS = false;

// ..........................................................
// PRIVATE HELPER METHODS
// 
// Private helper methods.  These are not kept as part of the class
// definition because hub.Object is copied frequently and we want to keep the
// number of class methods to a minimum.

/** @private
  Augments a base object by copying the properties from the extended hash.
  In addition to simply copying properties, this method also performs a 
  number of optimizations that can make init'ing a new object much faster
  including:
  
  - concating concatenatedProperties
  - prepping a list of observers and dependent keys
  - caching local observers so they don't need to be manually constructed

  @param {Hash} base hash
  @param {Hash} extension
  @returns {Hash} base hash
*/
hub._hub_object_extend = function _hub_object_extend(base, ext) {
  // Don't blow up when the user passes a protocol as if it were a mixin.
  if (!ext) ext = {} ;

  // set _kvo_cloned for later use
  base._hub_kvo_cloned = null;

  // get some common vars
  var key, idx, len, cur, cprops = base.concatenatedProperties, K = hub.K ;
  var p1,p2;

  // first, save any concat props.  use old or new array or concat
  idx = (cprops) ? cprops.length : 0 ;
  var concats = (idx>0) ? {} : null;
  while(--idx>=0) {
    key = cprops[idx]; p1 = base[key]; p2 = ext[key];

    if (p1) {
      if (!(p1 instanceof Array)) p1 = hub.A(p1);
      concats[key] = (p2) ? p1.concat(p2) : p2 ;
    } else {
      if (!(p2 instanceof Array)) p2 = hub.A(p2);
      concats[key] = p2 ;
    }
  }

  // Set up the arrays for observers and properties.  Normally, just save the 
  // arrays from the base.  If these need to be changed during processing, then 
  // they will be cloned first.
  var observers = base._hub_observers, clonedObservers = false,
      properties = base._hub_properties, clonedProperties = false,
      paths, pathLoc, local ;

  // now copy properties, add superclass to func.
  for(key in ext) {
    if (key === '_kvo_cloned') continue; // do not copy
    if (!ext.hasOwnProperty(key)) continue ; // avoid copying builtin methods

    // Get the value.  Use concats if defined.
    var value = (concats.hasOwnProperty(key) ? concats[key] : null) || ext[key] ;

    // Add observers and properties for functions...
    if (value && (value instanceof Function)) {

      // add super to funcs.  Be sure not to set the base of a func to 
      // itself to avoid infinite loops.
      if (!value.superclass && (value !== (cur=base[key]))) {
        value.superclass = value.base = cur || K;
      }

      // handle regular observers
      if (value.propertyPaths) {
        if (!clonedObservers) {
          observers = (observers || hub.EMPTY_ARRAY).slice() ;
          clonedObservers = true ;
        }
        observers[observers.length] = key ;

      // handle local properties
      } else if (paths = value.localPropertyPaths) {
        pathLoc = paths.length;
        while(--pathLoc >= 0) {
          local = base._hub_kvo_for(hub.keyFor('_kvo_local', paths[pathLoc]), hub.Set);
          local.add(key);
          base._hub_kvo_for('_kvo_observed_keys', hub.CoreSet).add(paths[pathLoc]);
        }

      // handle computed properties
      } else if (value.dependentKeys) {
        if (!clonedProperties) {
          properties = (properties || hub.EMPTY_ARRAY).slice() ;
          clonedProperties = true ;
        }
        properties[properties.length] = key ;
      }
    }

    // copy property
    base[key] = value ;
  }
  
  // Manually set base on toString() because some JS engines (such as IE8) do
  // not enumerate it
  if (ext.hasOwnProperty('toString')) {
    key = 'toString';
    // get the value.  use concats if defined
    value = (concats.hasOwnProperty(key) ? concats[key] : null) || ext[key] ;
    if (!value.superclass && (value !== (cur=base[key]))) {
      value.superclass = value.base = cur || K ;
    }
    // copy property
    base[key] = value ;
  }


  // copy observers and properties 
  base._hub_observers = observers || [] ;
  base._hub_properties = properties || [] ;

  return base ;
} ;

/**
  hub.Object is the root class for most classes defined by hub.js.  It builds 
  on top of the native object support provided by JavaScript to provide support 
  for class-like inheritance, properties observers, and more.
  
  Most of the classes you define in your model layer should inherit from 
  hub.Object or one of its subclasses, typically hub.Record.  If you are 
  writing objects of your own, you should read this documentation to learn some 
  of the details of how hub.Object's behave and how they differ from other 
  libraries.
  
  @class
  @extends hub.Observable 
*/
hub.Object = function(props) { return this._hub_object_init(props); };

hub.mixin(hub.Object, /** @scope hub.Object */ {

  /**
    Adds the passed properties to the object's class definition.  You can 
    pass as many hashes as you want, including Mixins, and they will be 
    added in the order they are passed.

    This is a shorthand for calling hub.mixin(MyClass, props...);
    
    @params {Hash} props the properties you want to add.
    @returns {Object} receiver
  */
  mixin: function(props) {
    var len = arguments.length, loc ;
    for(loc =0;loc<len;loc++) hub.mixin(this, arguments[loc]);
    return this ;
  },

  // ..........................................
  // CREATING CLASSES AND INSTANCES
  //

  /**
    Points to the superclass for this class.  You can use this to trace a
    class hierarchy.
    
    @property {hub.Object}
  */
  superclass: null,
  
  /**
    Creates a new subclass of the receiver, adding any passed properties to
    the instance definition of the new class.  You should use this method
    when you plan to create several objects based on a class with similar 
    properties.

    h2. Init

    If you define an init() method, it will be called when you create 
    instances of your new class.  Since hub.js uses the init() method to
    do important setup, you must be sure to always call 
    arguments.callee.base.apply(this, arguments) somewhere in your init() to 
    allow the normal setup to proceed.

    @params {Hash} props the methods of properties you want to add
    @returns {Class} A new object class
  */
  extend: function(props) {   
    var bench = hub.BENCHMARK_OBJECTS ;
    if (bench) hub.Benchmark.start('hub.Object.extend') ;

    // build a new constructor and copy class methods.  Do this before 
    // adding any other properties so they are not overwritten by the copy.
    var prop, ret = function(props) { return this._hub_object_init(props); } ;
    for(prop in this) {
      if (!this.hasOwnProperty(prop)) continue ;
      ret[prop] = this[prop];
    }
    
    // manually copy toString() because some JS engines do not enumerate it
    if (this.hasOwnProperty('toString')) ret.toString = this.toString;

    // now setup superclass, guid
    ret.superclass = this ;
    hub.generateGuid(ret); // setup guid

    ret.subclasses = hub.Set.create();
    this.subclasses.add(ret); // now we can walk a class hierarchy

    // setup new prototype and add properties to it
    var base = (ret.prototype = hub.beget(this.prototype));
    var idx, len = arguments.length;
    for(idx=0;idx<len;idx++) hub._hub_object_extend(base, arguments[idx]) ;
    base.constructor = ret; // save constructor

    if (bench) hub.Benchmark.end('hub.Object.extend') ;
    return ret ;
  },

  /**
    Creates a new instance of the class.

    Unlike most frameworks, you do not pass paramters into the init funciton
    for an object.  Instead, you pass a hash of additonal properties you 
    want to have assigned to the object when it is first created.  This is
    functionally like creating a anonymous subclass of the receiver and then
    instantiating it, but more efficient.

    You can use create() like you would a normal constructor in a 
    class-based system, or you can use it to create highly customized 
    singleton objects such as controllers or app-level objects.  This is 
    often more efficient than creating subclasses and than instantiating 
    them.

    You can pass any hash of properties to this method, including mixins.
    
    @param {Hash} props 
      optional hash of method or properties to add to the instance.
      
    @returns {hub.Object} new instance of the receiver class.
  */
  create: function(props) { var C=this; return new C(arguments); },

  /**
    Walk like a duck.  You can use this to quickly test classes.
    
    @property {Boolean}
  */
  isClass: true,

  /**
    Set of subclasses that extend from this class.  You can observe this 
    array if you want to be notified when the object is extended.
    
    @property {hub.Set}
  */
  subclasses: hub.Set.create(),
  
  /** @private */
  toString: function() { return hub._hub_object_className(this); },

  // ..........................................
  // PROPERTY SUPPORT METHODS
  //

  /** 
    Returns true if the receiver is a subclass of the named class.  If the 
    receiver is the class passed, this will return false since the class is not
    a subclass of itself.  See also kindOf().

    h2. Example
    
    {{{
      ClassA = hub.Object.extend();
      ClassB = ClassA.extend();

      ClassB.subclassOf(ClassA) => true
      ClassA.subclassOf(ClassA) => false
    }}}
    
    @param {Class} hubClass class to compare
    @returns {Boolean} 
  */
  subclassOf: function(hubClass) {
    if (this === hubClass) return false ;
    var t = this ;
    while(t = t.superclass) if (t === hubClass) return true ;
    return false ;
  },
  
  /**
    Returns true if the passed object is a subclass of the receiver.  This is 
    the inverse of subclassOf() which you call on the class you want to test.
    
    @param {Class} hubClass class to compare
    @returns {Boolean}
  */
  hasSubclass: function(hubClass) {
    return (hubClass && hubClass.subclassOf) ? hubClass.subclassOf(this) : false;
  },

  /**
    Returns true if the receiver is the passed class or is a subclass of the 
    passed class.  Unlike subclassOf(), this method will return true if you
    pass the receiver itself, since class is a kind of itself.  See also 
    subclassOf().

    h2. Example

    {{{
      ClassA = hub.Object.extend();
      ClassB = ClassA.extend();

      ClassB.kindOf(ClassA) => true
      ClassA.kindOf(ClassA) => true
    }}}
    
    @param {Class} hubClass class to compare
    @returns {Boolean} 
  */
  kindOf: function(hubClass) { 
    return (this === hubClass) || this.subclassOf(hubClass) ;
  }  
  
}) ;

// ..........................................
// DEFAULT OBJECT INSTANCE
// 
hub.Object.prototype = {
  
  _hub_kvo_enabled: true,
  
  /** @private
    This is the first method invoked on a new instance.  It will first apply
    any added properties to the new instance and then calls the real init()
    method.
    
    @param {Array} extensions an array-like object with hashes to apply.
    @returns {Object} receiver
  */
  _hub_object_init: function(extensions) {
    // apply any new properties
    var idx, len = (extensions) ? extensions.length : 0;
    for(idx=0;idx<len;idx++) hub._hub_object_extend(this, extensions[idx]) ;
    hub.generateGuid(this) ; // add guid
    this.init() ; // call real init
    
    // Call 'initMixin' methods to automatically setup modules.
    var inits = this.initMixin; len = (inits) ? inits.length : 0 ;
    for(idx=0;idx < len; idx++) inits[idx].call(this);
    
    return this ; // done!
  },
  
  /**
    You can call this method on an object to mixin one or more hashes of 
    properties on the receiver object.  In addition to simply copying 
    properties, this method will also prepare the properties for use in 
    key-value observing, computed properties, etc.
    
    If you plan to use this method, you should call it before you call
    the inherited init method from hub.Object or else your instance may not 
    function properly.
    
    h2. Example
    
    {{{
      // dynamically apply a mixin specified in an object property
      var MyClass = hub.Object.extend({
         extraMixin: null,
         
         init: function() {
           this.mixin(this.extraMixin);
           arguments.callee.base.apply();
         }
      });
      
      var ExampleMixin = { foo: "bar" };
      
      var instance = MyClass.create({ extraMixin: ExampleMixin }) ;
      
      instance.get('foo') => "bar"
    }}}

    @param {Hash} ext a hash to copy.  Only one.
    @returns {Object} receiver
  */
  mixin: function() {
    var idx, len = arguments.length;
    for(idx=0;idx<len;idx++) hub.mixin(this, arguments[idx]) ;

    // call initMixin
    for(idx=0;idx<len;idx++) {
      var init = arguments[idx].initMixin ;
      if (init) init.call(this) ;
    }
    return this ;
  },

  /**
    This method is invoked automatically whenever a new object is 
    instantiated.  You can override this method as you like to setup your
    new object.  

    Within your object, be sure to call arguments.callee.base.apply() to ensure 
    that the built-in init method is also called or your observers and computed 
    properties may not be configured.

    Although the default init() method returns the receiver, the return 
    value is ignored.

    @returns {void}
  */
  init: function() {
    this.initObservable();
    return this ;
  },

  /**
    Set to false once this object has been destroyed. 
    
    @property {Boolean}
  */
  isDestroyed: false,

  /**
    Call this method when you are finished with an object to teardown its
    contents.  Because JavaScript is garbage collected, you do not usually 
    need to call this method.  However, you may choose to do so for certain
    objects, especially views, in order to let them reclaim memory they 
    consume immediately.

    If you would like to perform additional cleanup when an object is
    finished, you may override this method.  Be sure to call 
    arguments.callee.base.apply(this, arguments).
    
    @returns {hub.Object} receiver
  */
  destroy: function() {
    if (this.get('isDestroyed')) return this; // nothing to do
    this.set('isDestroyed', true);

    // destroy any mixins
    var idx, inits = this.destroyMixin, len = (inits) ? inits.length : 0 ;
    for(idx=0;idx < len; idx++) inits[idx].call(this);

    return this ;
  },

  /**
    Walk like a duck. Always true since this is an object and not a class.
    
    @property {Boolean}
  */
  isObject: true,

  /**
    Returns true if the named value is an executable function.

    @param methodName {String} the property name to check
    @returns {Boolean}
  */
  respondsTo: function( methodName ) {
    return !!(hub.typeOf(this[methodName]) === hub.T_FUNCTION);
  },
  
  /**
    Attemps to invoked the named method, passing the included two arguments.  
    Returns true if the method is either not implemented or if the handler 
    returns false (indicating that it did not handle the event).  This method 
    is invoked to deliver actions from menu items and to deliver events.  
    You can override this method to provide additional handling if you 
    prefer.

    @param {String} methodName
    @param {Object} arg1
    @param {Object} arg2
    @returns {Boolean} true if handled, false if not handled
  */
  tryToPerform: function(methodName, arg1, arg2) {
    return this.respondsTo(methodName) && (this[methodName](arg1, arg2) !== false);
  },

  /**  
    EXPERIMENTAL:  You can use this to invoke a superclass implementation in
    any method.  This does not work in Safari 2 or earlier.  If you need to
    target Safari 2, use arguments.callee.base.apply(this, arguments);
    
    h2. Example
    
    All of the following methods will call the superclass implementation of
    your method:
    
    {{{
      hub.Object.create({
        
        // DOES NOT WORK IN SAFARI 2 OR EARLIER
        method1: function() {
          this.superclass();
        },
        
        // WORKS ANYTIME
        method3: function() {
          arguments.callee.base.apply(this, arguments);
        }
      });
    }}}

    @params args {*args} any arguments you want to pass along.
    @returns {Object} return value from super
  */
  superclass: function(args) {
    var caller = arguments.callee.caller; 
    if (!caller) throw "superclass cannot determine the caller method" ;
    return caller.superclass ? caller.superclass.apply(this, arguments) : null;
  },

  /**  
    returns true if the receiver is an instance of the named class.  See also
    kindOf().

    h2. Example
    
    {{{
      var ClassA = hub.Object.extend();
      var ClassB = hub.Object.extend();
      
      var instA = ClassA.create();
      var instB = ClassB.create();
      
      instA.instanceOf(ClassA) => true
      instB.instanceOf(ClassA) => false
    }}}
    
    @param {Class} hubClass the class
    @returns {Boolean}
  */
  instanceOf: function(hubClass) {
    return this.constructor === hubClass ;  
  },

  /**  
    Returns true if the receiver is an instance of the named class or any 
    subclass of the named class.  See also instanceOf().

    h2. Example
    
    {{{
      var ClassA = hub.Object.extend();
      var ClassB = hub.Object.extend();
      
      var instA = ClassA.create();
      var instB = ClassB.create();
      
      instA.kindOf(ClassA) => true
      instB.kindOf(ClassA) => true
    }}}

    @param hubClass {Class} the class
    @returns {Boolean}
  */
  kindOf: function(hubClass) { return this.constructor.kindOf(hubClass); },

  /** @private */
  toString: function() {
    if (!this._hub_object_toString) {
      // only cache the string if the klass name is available
      var klassName = hub._hub_object_className(this.constructor) ;
      var string = hub.fmt("%@:%@", klassName, hub.guidFor(this));
      if (klassName) this._hub_object_toString = string ;
      else return string ;
    } 
    return this._hub_object_toString ;
  },

  /**
    The properties named in this array will be concatenated in subclasses
    instead of replaced.  This allows you to name special properties that
    should contain any values you specify *plus* values specified by parents.

    It is used by hub.js and is available for your use, though you 
    should limit the number of properties you include in this list as it 
    adds a slight overhead to new class and instance creation.

    @property {Array}
  */
  concatenatedProperties: ['concatenatedProperties', 'initMixin', 'destroyMixin']  

} ;

// bootstrap the constructor for hub.Object.
hub.Object.prototype.constructor = hub.Object;

// Add observable to mixin
hub.mixin(hub.Object.prototype, hub.Observable) ;

// ..........................................................
// CLASS NAME SUPPORT
// 

/** @private
  This is a way of performing brute-force introspection.  This searches 
  through all the top-level properties looking for classes.  When it finds
  one, it saves the class path name.
*/
function findClassNames() {

  if (hub._hub_object_foundObjectClassNames) return ;
  hub._hub_object_foundObjectClassNames = true ;

  var seen = [] ;
  var searchObject = function(root, object, levels) {
    levels-- ;

    // not the fastest, but safe
    if (seen.indexOf(object) >= 0) return ;
    seen.push(object) ;

    for(var key in object) {
      if (key == '__scope__') continue ;
      if (key == 'superclass') continue ;
      if (!key.match(/^[A-Z0-9]/)) continue ;

      var path = (root) ? [root,key].join('.') : key ;
      var value = object[key] ;


      switch(hub.typeOf(value)) {
      case hub.T_CLASS:
        if (!value._hub_object_className) value._hub_object_className = path;
        if (levels>=0) searchObject(path, value, levels) ;
        break ;

      case hub.T_OBJECT:
        if (levels>=0) searchObject(path, value, levels) ;
        break ;

      case hub.T_HASH:
        if (((root) || (path==='hub')) && (levels>=0)) searchObject(path, value, levels) ;
        break ;

      default:
        break;
      }
    }
  } ;

  searchObject(null, window, 2) ;
}

/**  
  Same as the instance method, but lets you check instanceOf without having to 
  first check if instanceOf exists as a method.
  
  @param {Object} hubObject the object to check instance of
  @param {Class} hubClass the class
  @returns {Boolean} if hubObject is instance of class
*/
hub.instanceOf = function(hubObject, hubClass) {
  return !!(hubObject && hubObject.constructor === hubClass) ;  
};

/**
  Same as the instance method, but lets you check kindOf without having to 
  first check if kindOf exists as a method.
  
  @param {Object} hubObject object to check kind of
  @param {Class} hubClass the class to check
  @returns {Boolean} if hubObject is an instance of hubClass or subclass
*/
hub.kindOf = function(hubObject, hubClass) {
  if (hubObject && !hubObject.isClass) hubObject = hubObject.constructor;
  return !!(hubObject && hubObject.kindOf && hubObject.kindOf(hubClass));
};

/** @private
  Returns the name of this class.  If the name is not known, triggers
  a search.  This can be expensive the first time it is called.
  
  This method is used to allow classes to determine their own name.
*/
hub._hub_object_className = function(obj) {
  if (!hub.isReady) return ''; // class names are not available until ready
  if (!obj._hub_object_className) findClassNames() ;
  if (obj._hub_object_className) return obj._hub_object_className ;

  // if no direct classname was found, walk up class chain looking for a 
  // match.
  var ret = obj ;
  while(ret && !ret._hub_object_className) ret = ret.superclass; 
  return (ret && ret._hub_object_className) ? ret._hub_object_className : 'Anonymous';
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

// ........................................................................
// CHAIN OBSERVER
//

// This is a private class used by the observable mixin to support chained
// properties.

// ChainObservers are used to automatically monitor a property several 
// layers deep.
// org.plan.name = hub._ChainObserver.create({
//    target: this, property: 'org',
//    next: hub._ChainObserver.create({
//      property: 'plan',
//      next: hub._ChainObserver.create({
//        property: 'name', func: myFunc
//      })
//    })
//  })
//
hub._hub_ChainObserver = function(property) {
  this.property = property ;
} ;

// This is the primary entry point.  Configures the chain.
hub._hub_ChainObserver.createChain = function(rootObject, path, target, method, context) {

  // First we create the chain.
  var parts = path.split('.'),
      root  = new hub._hub_ChainObserver(parts[0]),
      tail  = root,
      len   = parts.length;

  for(var idx=1;idx<len;idx++) {
    tail = tail.next = new hub._hub_ChainObserver(parts[idx]) ;
  }
  
  // Now root has the first observer and tail has the last one.
  // Feed the rootObject into the front to setup the chain...
  // do this BEFORE we set the target/method so they will not be triggered.
  root.objectDidChange(rootObject);
  
  // Finally, set the target/method on the tail so that future changes will
  // trigger.
  tail.target = target; tail.method = method ; tail.context = context ;
  
  // and return the root to save
  return root ;
};

hub._hub_ChainObserver.prototype = {
  isChainObserver: true,
  
  // the object this instance is observing
  object: null,
  
  // the property on the object this link is observing.
  property: null,
  
  // if not null, this is the next link in the chain.  Whenever the 
  // current property changes, the next observer will be notified.
  next: null,
  
  // if not null, this is the final target observer.
  target: null,
  
  // if not null, this is the final target method
  method: null,
  
  // invoked when the source object changes.  removes observer on old 
  // object, sets up new observer, if needed.
  objectDidChange: function(newObject) {
    if (newObject === this.object) return; // nothing to do.
    
    // if an old object, remove observer on it.
    if (this.object && this.object.removeObserver) {
      this.object.removeObserver(this.property, this, this.propertyDidChange);
    }
    
    // if a new object, add observer on it...
    this.object = newObject ;
    if (this.object && this.object.addObserver) {
      this.object.addObserver(this.property, this, this.propertyDidChange); 
    }
    
    // now, notify myself that my property value has probably changed.
    this.propertyDidChange() ;
  },
  
  // the observer method invoked when the observed property changes.
  propertyDidChange: function() {
    
    // get the new value
    var object = this.object ;
    var property = this.property ;
    var value = (object && object.get) ? object.get(property) : null ;
    
    // if we have a next object in the chain, notify it that its object 
    // did change...
    if (this.next) this.next.objectDidChange(value) ;
    
    // if we have a target/method, call it.
    var target  = this.target,
        method  = this.method,
        context = this.context ;
    if (target && method) {
      var rev = object ? object.propertyRevision : null ;
      if (context) {
        method.call(target, object, property, value, context, rev);
      } else {
        method.call(target, object, property, value, rev) ;
      }
    } 
  },
  
  // teardown the chain...
  destroyChain: function() {
    
    // remove observer
    var obj = this.object ;
    if (obj && obj.removeObserver) {
      obj.removeObserver(this.property, this, this.propertyDidChange) ;
    }  
    
    // destroy next item in chain
    if (this.next) this.next.destroyChain() ;
    
    // and clear left overs...
    this.next = this.target = this.method = this.object = this.context = null;
    return null ;
  }
  
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

// ........................................................................
// OBSERVER QUEUE
//
// This queue is used to hold observers when the object you tried to observe
// does not exist yet.  This queue is flushed just before any property 
// notification is sent.

/**
  The private ObserverQueue is used to maintain a set of pending observers. 
  This allows you to setup an observer on an object before the object exists.
  
  Whenever the observer fires, the queue will be flushed to connect any 
  pending observers.
  
  @namespace
*/
hub.ObserverQueue = {

  queue: [],
  
  /**
   @private 
  
   Attempt to add the named observer.  If the observer cannot be found, put
   it into a queue for later.
  */
  addObserver: function(propertyPath, target, method, pathRoot) {
    var tuple ;

    // try to get the tuple for this.
    if (hub.typeOf(propertyPath) === hub.T_STRING) {
      tuple = hub.tupleForPropertyPath(propertyPath, pathRoot) ;
    } else {
      tuple = propertyPath; 
    }

    // if a tuple was found, add the observer immediately...
    if (tuple) {
      tuple[0].addObserver(tuple[1],target, method) ;
      
    // otherwise, save this in the queue.
    } else {
      this.queue.push([propertyPath, target, method, pathRoot]) ;
    }
  },

  /** 
    @private 
  
    Remove the observer.  If it is already in the queue, remove it.  Also
    if already found on the object, remove that.
  */
  removeObserver: function(propertyPath, target, method, pathRoot) {
    var idx, queue, tuple, item;
    
    tuple = hub.tupleForPropertyPath(propertyPath, pathRoot) ;
    if (tuple) {
      tuple[0].removeObserver(tuple[1], target, method) ;
    } 

    idx = this.queue.length; queue = this.queue ;
    while(--idx >= 0) {
      item = queue[idx] ;
      if ((item[0] === propertyPath) && (item[1] === target) && (item[2] == method) && (item[3] === pathRoot)) queue[idx] = null ;
    }
  },
  
  /**
    @private 
    
    Range Observers register here to indicate that they may potentially 
    need to start observing.
  */
  addPendingRangeObserver: function(observer) {
    var ro = this.rangeObservers;
    if (!ro) ro = this.rangeObservers = hub.CoreSet.create();
    ro.add(observer);
    return this ;
  },
  
  _hub_TMP_OUT: [],
  
  /** 
    Flush the queue.  Attempt to add any saved observers.
  */
  flush: function(object) { 
       
    // flush any observers that we tried to setup but didn't have a path yet
    var oldQueue = this.queue ;
    if (oldQueue && oldQueue.length > 0) {
      var newQueue = (this.queue = []) ; 
      var idx = oldQueue.length ;
      while(--idx >= 0) {
        var item = oldQueue[idx] ;
        if (!item) continue ;

        var tuple = hub.tupleForPropertyPath(item[0], item[3]);
        if (tuple) {
          tuple[0].addObserver(tuple[1], item[1], item[2]) ;
        } else newQueue.push(item) ;
      }
    }
    
    // if this object needsRangeObserver then see if any pending range 
    // observers need it.
    if (object._hub_kvo_needsRangeObserver) {
      var set = this.rangeObservers,
          len = set ? set.get('length') : 0,
          out = this._hub_TMP_OUT,
          ro;
          
      for(idx=0;idx<len;idx++) {
        ro = set[idx]; // get the range observer
        if (ro.setupPending(object)) {
          out.push(ro); // save to remove later
        }
      }
      
      // remove any that have setup
      if (out.length > 0) set.removeEach(out);
      out.length = 0; // reset
      object._hub_kvo_needsRangeObserver = false ;
    }
    
  },
  
  /** @private */
  isObservingSuspended: 0,

  _hub_pending: hub.CoreSet.create(),

  /** @private */
  objectHasPendingChanges: function(obj) {
    this._hub_pending.add(obj) ; // save for later
  },

  /** @private */
  // temporarily suspends all property change notifications.
  suspendPropertyObserving: function() {
    this.isObservingSuspended++ ;
  },
  
  // resume change notifications.  This will call notifications to be
  // delivered for all pending objects.
  /** @private */
  resumePropertyObserving: function() {
    var pending ;
    if(--this.isObservingSuspended <= 0) {
      pending = this._hub_pending ;
      this._hub_pending = hub.CoreSet.create() ;
      
      var idx, len = pending.length;
      for(idx=0;idx<len;idx++) {
        pending[idx]._hub_notifyPropertyObservers() ;
      }
      pending.clear();
      pending = null ;
    }
  }
  
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  An error, used to represent an error state.
  
  Many API's within hub.js will return an instance of this class when an error 
  occurs.  hub.Error includes an error code, description, and an optional human-
  readable label that indicates the what failed.
  
  Depending on the error, other properties may also be added to the object
  to help you recover from the error.
  
  You can easily determine if the value returned by some API is an error or not 
  using the helper hub.ok(value).
  
  h2. Faking Error Objects
  
  You can actually make any object you want be treated like an Error object
  by simply implementing two properties: isError and errorValue.  If you set 
  isError to true, then calling hub.ok(obj) on your object will return false.
  If isError is true, then hub.val(obj) will return your errorValue property 
  instead of the receiver.
  
  @class
  @extends hub.Object
*/
hub.Error = hub.Object.extend(
/** @scope hub.Error.prototype */ {
  
  /**
    error code.  Used to designate the error type.
    
    @property {Number}
  */
  code: -1,
  
  /**
    Human readable description of the error.  This can also be a non-localized
    key.
    
    @property {String}
  */
  message: '',
  
  /**
    The value the error represents.  This is used when wrapping a value inside
    of an error to represent the validation failure.
    
    @property {Object}
  */
  errorValue: null,
  
  /**
    The original error object.  Normally this will return the receiver.  
    However, sometimes another object will masquarade as an error; this gives
    you a way to get at the underyling error.
    
    @property {hub.Error}
  */
  errorObject: function() {
    return this;
  }.property().cacheable(),
  
  /**
    Human readable name of the item with the error.
    
    @property {String}
  */
  label: null,

  /** @private */
  toString: function() {
    return hub.fmt("hub.Error:%@:%@ (%@)",
      hub.guidFor(this),
      this.get('message'),
      this.get('code')
    );
  },
  
  /**
    Walk like a duck.
    
    @property {Boolean}
  */
  isError: true
}) ;

/**
  Creates a new hub.Error instance with the passed description, label, and
  code.  All parameters are optional.
  
  @param description {String} human readable description of the error
  @param label {String} human readable name of the item with the error
  @param code {Number} an error code to use for testing.
  @returns {hub.Error} new error instance.
*/
hub.Error.desc = function(description, label, value, code) {
  var opts = { message: description } ;
  if (label !== undefined) opts.label = label ;
  if (code !== undefined) opts.code = code ;
  if (value !== undefined) opts.errorValue = value ;
  return this.create(opts) ;
} ;

/**
  Shorthand form of the hub.Error.desc method.

  @param description {String} human readable description of the error
  @param label {String} human readable name of the item with the error
  @param code {Number} an error code to use for testing.
  @returns {hub.Error} new error instance.
*/
hub.E = function(description, label, value, c) {
  return hub.Error.desc(description,label, value, c) ;
} ;

/**
  Returns true if the passed value is an error object or false.
  
  @param {Object} ret object value
  @returns {Boolean}
*/
hub.ok = function(ret) {
  return (ret !== false) && !(ret && ret.isError) ;
};

/**
  Returns the value of an object.  If the passed object is an error, returns
  the value associated with the error; otherwise returns the receiver itself.
  
  @param {Object} obj the object
  @returns {Object} value 
*/
hub.val = function(obj) {
  if (obj && obj.isError) {
    return obj.get ? obj.get('errorValue') : null ; // Error has no value
  } else return obj ;
};

// STANDARD ERROR OBJECTS

/**
  Standard error code for errors that do not support multiple values.
  
  @property {Number}
*/
hub.Error.HAS_MULTIPLE_VALUES = -100 ;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub hub_precondition */

/**
  A collection of ranges.  You can use an IndexSet to keep track of non-
  continuous ranges of items in a parent array.  IndexSet's are used for 
  selection, for managing invalidation ranges and other data-propogation.

  h2. Examples
  
  {{{
    var set = hub.IndexSet.create(ranges) ;
    set.contains(index);
    set.add(index, length);
    set.remove(index, length);
    
    // uses a backing hub.Array object to return each index
    set.forEach(function(object) { .. })
    
    // returns the index
    set.forEachIndex(function(index) { ... });
    
    // returns ranges
    set.forEachRange(function(start, length) { .. });
  }}}

  h2. Implementation Notes

  An IndexSet stores indices on the object.  A positive value great than the
  index tells you the end of an occupied range.  A negative values tells you
  the end of an empty range.  A value less than the index is a search 
  accelerator.  It tells you the start of the nearest range.

  @class
  @extends hub.Enumerable 
  @extends hub.Observable
  @extends hub.Copyable
  @extends hub.Freezable
*/
hub.IndexSet = hub.mixin({}, 
  hub.Enumerable, hub.Observable, hub.Freezable, hub.Copyable,
/** @scope hub.IndexSet.prototype */ {

  /** @private
    Walks a content array and copies its contents to a new array.  For large
    content arrays this is faster than using slice()
  */
  _hub_sliceContent: function(c) {
    if (c.length < 1000) return c.slice(); // use native when faster
    var cur = 0, ret = [], next = c[0];
    while(next !== 0) {
      ret[cur] = next ;
      cur = (next<0) ? (0-next) : next ;
      next = c[cur];
    }
    ret[cur] = 0;
    this._hub_hint(0, cur, ret); // hints are not copied manually - add them
    return ret ;
  },
  
  /**
    To create a set, pass either a start and index or another IndexSet.
    
    @returns {hub.IndexSet}
  */
  create: function(start, length) { 
    var ret = hub.beget(this);
    ret.initObservable();
    
    // optimized method to clone an index set.
    if (start && start.isIndexSet) {
      ret._hub_content = this._hub_sliceContent(start._hub_content);
      ret.max = start.max;
      ret.length = start.length; 
      ret.source = start.source ;
      
    // otherwise just do a regular add
    } else {
      ret._hub_content = [0];
      if (start !== undefined) ret.add(start, length);
    }
    return ret ;
  },

  /**
    Walk like a duck.
    
    @property {Boolean}
  */
  isIndexSet: true,

  /**  @private 
    Internal setting determines the preferred skip size for hinting sets.
    
    @property {Number}
  */
  HINT_SIZE: 256,
  
  /**
    Total number of indexes contained in the set

    @property {Number}
  */
  length: 0,
  
  /**
    One greater than the largest index currently stored in the set.  This 
    is sometimes useful when determining the total range of items covering
    the index set.
    
    @property {Number}
  */
  max: 0,
  
  /**
    The first index included in the set or -1.
    
    @property {Number}
  */
  min: function() {  
    var content = this._hub_content, 
        cur = content[0];
    return (cur === 0) ? -1 : (cur>0) ? 0 : Math.abs(cur);
    
  }.property('[]').cacheable(),
  
  /**
    Returns the first index in the set .
    
    @property {Number}
  */
  firstObject: function() {
    return (this.get('length')>0) ? this.get('min') : undefined;  
  }.property(),
  
  /** 
    Returns the starting index of the nearest range for the specified 
    index.
    
    @param {Number} index
    @returns {Number} starting index
  */
  rangeStartForIndex: function(index) {    
    var content = this._hub_content,
        max     = this.get('max'),
        ret, next, accel;
    
    // fast cases
    if (index >= max) return max ;
    if (Math.abs(content[index]) > index) return index ; // we hit a border
    
    // use accelerator to find nearest content range
    accel = index - (index % hub.IndexSet.HINT_SIZE);
    ret = content[accel];
    if (ret<0 || ret>index) ret = accel;
    next = Math.abs(content[ret]);

    // now step forward through ranges until we find one that includes the
    // index.
    while (next < index) {
      ret = next ;
      next = Math.abs(content[ret]);
    }
    return ret ;
  },
    
  /**
    Returns true if the passed index set contains the exact same indexes as 
    the receiver.  If you pass any object other than an index set, returns 
    false.
    
    @param {Object} obj another object.
    @returns {Boolean}
  */
  isEqual: function(obj) {
    
    // optimize for some special cases
    if (obj === this) return true ;
    if (!obj || !obj.isIndexSet || (obj.max !== this.max) || (obj.length !== this.length)) return false;

    // ok, now we need to actually compare the ranges of the two.
    var lcontent = this._hub_content,
        rcontent = obj._hub_content,
        cur      = 0,
        next     = lcontent[cur];
    
    do {
      if (rcontent[cur] !== next) return false ;
      cur = Math.abs(next) ;
      next = lcontent[cur];
    } while (cur !== 0);
    return true ;
  },
  
  /**
    Returns the first index in the set before the passed index or null if 
    there are no previous indexes in the set.
    
    @param {Number} index index to check
    @returns {Number} index or -1
  */
  indexBefore: function(index) {
    
    if (index===0) return -1; // fast path
    index--; // start with previous index
    
    var content = this._hub_content, 
        max     = this.get('max'),
        start   = this.rangeStartForIndex(index);
    if (!content) return null;

    // loop backwards until we find a range that is in the set.
    while((start===max) || (content[start]<0)) {
      if (start === 0) return -1 ; // nothing before; just quit
      index = start -1 ;
      start = this.rangeStartForIndex(index);
    }
    
    return index;
  },

  /**
    Returns the first index in the set after the passed index or null if 
    there are no additional indexes in the set.
    
    @param {Number} index index to check
    @returns {Number} index or -1
  */
  indexAfter: function(index) {
    var content = this._hub_content,
        max     = this.get('max'),
        start, next ;
    if (!content || (index>=max)) return -1; // fast path
    index++; // start with next index
    

    // loop forwards until we find a range that is in the set.
    start = this.rangeStartForIndex(index);
    next  = content[start];
    while(next<0) {
      if (next === 0) return -1 ; //nothing after; just quit
      index = start = Math.abs(next);
      next  = content[start];
    }
    
    return index;
  },
  
  /**
    Returns true if the index set contains the named index
    
    @param {Number} start index or range
    @param {Number} length optional range length
    @returns {Boolean}
  */
  contains: function(start, length) {
    var content, cur, next, rstart, rnext;
    
    // normalize input
    if (length === undefined) { 
      if (start === null || start === undefined) return false ;
      
      if (typeof start === hub.T_NUMBER) {
        length = 1 ;
        
      // if passed an index set, check each receiver range
      } else if (start && start.isIndexSet) {
        if (start === this) return true ; // optimization

        content = start._hub_content ;
        cur = 0 ;
        next = content[cur];
        while (next !== 0) {
          if ((next>0) && !this.contains(cur, next-cur)) return false ;
          cur = Math.abs(next);
          next = content[cur];
        }
        return true ;
        
      } else {
        length = start.length; 
        start = start.start;
      }
    }
    
    rstart = this.rangeStartForIndex(start);
    rnext  = this._hub_content[rstart];
    
    return (rnext>0) && (rstart <= start) && (rnext >= (start+length));
  },

  /**
    Returns true if the index set contains any of the passed indexes.  You
    can pass a single index, a range or an index set.
    
    @param {Number} start index, range, or IndexSet
    @param {Number} length optional range length
    @returns {Boolean}
  */
  intersects: function(start, length) {
    var content, cur, next, lim;
    
    // normalize input
    if (length === undefined) { 
      if (typeof start === hub.T_NUMBER) {
        length = 1 ;
        
      // if passed an index set, check each receiver range
      } else if (start && start.isIndexSet) {
        if (start === this) return true ; // optimization

        content = start._hub_content ;
        cur = 0 ;
        next = content[cur];
        while (next !== 0) {
          if ((next>0) && this.intersects(cur, next-cur)) return true ;
          cur = Math.abs(next);
          next = content[cur];
        }
        return false ;
        
      } else {
        length = start.length; 
        start = start.start;
      }
    }
    
    cur     = this.rangeStartForIndex(start);
    content = this._hub_content;
    next    = content[cur];
    lim     = start + length;
    while (cur < lim) {
      if (next === 0) return false; // no match and at end!
      if ((next > 0) && (next > start)) return true ; // found a match
      cur = Math.abs(next);
      next = content[cur];
    }
    return false ; // no match
  },

  /**
    Returns a new IndexSet without the passed range or indexes.   This is a
    convenience over simply cloning and removing.  Does some optimizations.
    
    @param {Number} start index, range, or IndexSet
    @param {Number} length optional range length
    @returns {hub.IndexSet} new index set
  */
  without: function(start, length) {
    if (start === this) return hub.IndexSet.create(); // just need empty set
    return this.clone().remove(start, length);
  },
  
  /**
    Replace the index set's current content with the passed index set.  This
    is faster than clearing the index set adding the values again.
    
    @param {Number} start index, Range, or another IndexSet
    @param {Number} length optional length of range. 
    @returns {hub.IndexSet} receiver
  */
  replace: function(start, length) {
    
    if (length === undefined) {
      if (typeof start === hub.T_NUMBER) {
        length = 1 ;
      } else if (start && start.isIndexSet) {
        this._hub_content = this._hub_sliceContent(start._hub_content);
        this.beginPropertyChanges()
          .set('max', start.max)
          .set('length', start.length)
          .set('source', start.source)
          .enumerableContentDidChange()
        .endPropertyChanges();
        return this ;
        
      } else {
        length = start.length;
        start  = start.start;
      }
    }
    
    var oldlen = this.length;
    this._hub_content.length=1;
    this._hub_content[0] = 0;
    this.length = this.max = 0 ; // reset without notifying since add()
    return this.add(start, length);
  },
  
  /**
    Adds the specified range of indexes to the set.  You can also pass another
    IndexSet to union the contents of the index set with the receiver.
    
    @param {Number} start index, Range, or another IndexSet
    @param {Number} length optional length of range. 
    @returns {hub.IndexSet} receiver
  */
  add: function(start, length) {
    
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    
    var content, cur, next;

    // normalize IndexSet input
    if (start && start.isIndexSet) {
      
      content = start._hub_content;
      
      if (!content) return this; // nothing to do

      cur = 0 ;
      next = content[0];
      while(next !== 0) {
        if (next>0) this.add(cur, next-cur);
        cur = next<0 ? 0-next : next;
        next = content[cur];
      }
      return this ;
      
    } else if (length === undefined) { 
      
      if (start === null || start === undefined) {
        return this; // nothing to do
      } else if (typeof start === hub.T_NUMBER) {
        length = 1 ;
      } else {
        length = start.length; 
        start = start.start;
      }
    } else if (length === null) length = 1 ;
    
    hub_precondition(typeof start === hub.T_NUMBER);  // Make sure we have the
    hub_precondition(typeof length === hub.T_NUMBER); // Correct data.
    
    // if no length - do nothing.
    if (length <= 0) return this;
    
    // special case - appending to end of set
    var max     = this.get('max'),
        oldmax  = max,
        delta, value ;

    content = this._hub_content ;
    
    if (start === max) {

      // if adding to the end and the end is in set, merge.
      if (start > 0) {
        cur = this.rangeStartForIndex(start-1);
        next = content[cur];
        
        // just extend range at end
        if (next > 0) { 
          delete content[max]; // no 0
          content[cur] = max = start + length ;
          start = cur ;
          
        // previous range was not in set, just tack onto the end
        } else {
          content[max] = max = start + length;
        }
      } else {
        content[start] = max = length;
      }
      
      content[max] = 0 ;
      this.set('max', max);
      this.set('length', this.length + length) ;
      length = max - start ;
      
    } else if (start > max) {
      content[max] = 0-start; // empty!
      content[start] = start+length ;
      content[start+length] = 0; // set end
      this.set('max', start + length) ;
      this.set('length', this.length + length) ;
      
      // affected range goes from starting range to end of content.
      length = start + length - max ;
      start = max ;
      
    // otherwise, merge into existing range
    } else {

      // find nearest starting range.  split or join that range
      cur   = this.rangeStartForIndex(start);
      next  = content[cur];
      max   = start + length ;
      delta = 0 ;

      // we are right on a boundary and we had a range or were the end, then
      // go back one more.
      if ((start>0) && (cur === start) && (next <= 0)) {
        cur = this.rangeStartForIndex(start-1);
        next = content[cur] ;
      }
      
      // previous range is not in set.  splice it here
      if (next < 0) { 
        content[cur] = 0-start ;
        
        // if previous range extends beyond this range, splice afterwards also
        if (Math.abs(next) > max) {
          content[start] = 0-max;
          content[max] = next ;
        } else content[start] = next;
        
      // previous range is in set.  merge the ranges
      } else {
        start = cur ;
        if (next > max) {
          // delta -= next - max ;
          max = next ;
        }
      }
      
      // at this point there should be clean starting point for the range.
      // just walk the ranges, adding up the length delta and then removing
      // the range until we find a range that passes last
      cur = start;
      while (cur < max) {
        // get next boundary.  splice if needed - if value is 0, we are at end
        // just skip to last
        value = content[cur];
        if (value === 0) {
          content[max] = 0;
          next = max ;
          delta += max - cur ;
        } else {
          next  = Math.abs(value);
          if (next > max) {
            content[max] = value ;
            next = max ;
          }

          // ok, cur range is entirely inside top range.  
          // add to delta if needed
          if (value < 0) delta += next - cur ;
        }

        delete content[cur] ; // and remove range
        cur = next;
      }
      
      // cur should always === last now.  if the following range is in set,
      // merge in also - don't adjust delta because these aren't new indexes
      if ((cur = content[max]) > 0) {
        delete content[max];     
        max = cur ;
      }

      // finally set my own range.
      content[start] = max ;
      if (max > oldmax) this.set('max', max) ;

      // adjust length
      this.set('length', this.get('length') + delta);
      
      // compute hint range
      length = max - start ;
    }
    
    this._hub_hint(start, length);
    if (delta !== 0) this.enumerableContentDidChange();
    return this;
  },

  /**
    Removes the specified range of indexes from the set
    
    @param {Number} start index, Range, or IndexSet
    @param {Number} length optional length of range. 
    @returns {hub.IndexSet} receiver
  */
  remove: function(start, length) {

    if (this.isFrozen) throw hub.FROZEN_ERROR;
    
    // normalize input
    if (length === undefined) { 
      if (start === null || start === undefined) {
        return this; // nothing to do

      } else if (typeof start === hub.T_NUMBER) {
        length = 1 ;
      
      // if passed an index set, just add each range in the index set.
      } else if (start.isIndexSet) {
        start.forEachRange(this.remove, this);
        return this;

      } else {
        length = start.length; 
        start = start.start;
      }
    }

    if (length <= 0) return this; // nothing to do
    
    // special case - appending to end of set
    var max     = this.get('max'),
        oldmax  = max,
        content = this._hub_content,
        cur, next, delta, value, last ;

    // if we're past the end, do nothing.
    if (start >= max) return this;

    // find nearest starting range.  split or join that range
    cur   = this.rangeStartForIndex(start);
    next  = content[cur];
    last  = start + length ;
    delta = 0 ;

    // we are right on a boundary and we had a range or were the end, then
    // go back one more.
    if ((start>0) && (cur === start) && (next > 0)) {
      cur = this.rangeStartForIndex(start-1);
      next = content[cur] ;
    }
    
    // previous range is in set.  splice it here
    if (next > 0) { 
      content[cur] = start ;
      
      // if previous range extends beyond this range, splice afterwards also
      if (next > last) {
        content[start] = last;
        content[last] = next ;
      } else content[start] = next;
      
    // previous range is not in set.  merge the ranges
    } else {
      start = cur ;
      next  = Math.abs(next);
      if (next > last) {
        last = next ;
      }
    }
    
    // at this point there should be clean starting point for the range.
    // just walk the ranges, adding up the length delta and then removing
    // the range until we find a range that passes last
    cur = start;
    while (cur < last) {
      // get next boundary.  splice if needed - if value is 0, we are at end
      // just skip to last
      value = content[cur];
      if (value === 0) {
        content[last] = 0;
        next = last ;

      } else {
        next  = Math.abs(value);
        if (next > last) {
          content[last] = value ;
          next = last ;
        }

        // ok, cur range is entirely inside top range.  
        // add to delta if needed
        if (value > 0) delta += next - cur ;
      }

      delete content[cur] ; // and remove range
      cur = next;
    }
    
    // cur should always === last now.  if the following range is not in set,
    // merge in also - don't adjust delta because these aren't new indexes
    if ((cur = content[last]) < 0) {
      delete content[last];     
      last = Math.abs(cur) ;
    }

    // set my own range - if the next item is 0, then clear it.
    if (content[last] === 0) {
      delete content[last];
      content[start] = 0 ;
      this.set('max', start); //max has changed
      
    } else {
      content[start] = 0-last ;
    }

    // adjust length
    this.set('length', this.get('length') - delta);
    
    // compute hint range
    length = last - start ;
    
    this._hub_hint(start, length);
    if (delta !== 0) this.enumerableContentDidChange();
    return this;
  },
    
  /** @private 
    iterates through a named range, setting hints every HINT_SIZE indexes 
    pointing to the nearest range start.  The passed range must start on a
    range boundary.  It can end anywhere.
  */
  _hub_hint: function(start, length, content) {
    if (content === undefined) content = this._hub_content;
    
    var skip    = hub.IndexSet.HINT_SIZE,
        next    = Math.abs(content[start]), // start of next range
        loc     = start - (start % skip) + skip, // next hint loc
        lim     = start + length ; // stop
        
    while (loc < lim) {
      // make sure we are in current rnage
      while ((next !== 0) && (next <= loc)) {
        start = next ; 
        next  = Math.abs(content[start]) ;
      }
      
      // past end
      if (next === 0) {
        delete content[loc];

      // do not change if on actual boundary
      } else if (loc !== start) {
        content[loc] = start ;  // set hint
      }
      
      loc += skip;
    }
  },

  /**
    Clears the set 
  */
  clear: function() {
    if (this.isFrozen) throw hub.FROZEN_ERROR;
    
    var oldlen = this.length;
    this._hub_content.length=1;
    this._hub_content[0] = 0;
    this.set('length', 0).set('max', 0);
    if (oldlen > 0) this.enumerableContentDidChange();
  },
  
  /**
    Add all the ranges in the passed array.
  */
  addEach: function(objects) {
    if (this.isFrozen) throw hub.FROZEN_ERROR;

    this.beginPropertyChanges();
    var idx = objects.get('length') ;
    if (objects.isHubArray) {
      while(--idx >= 0) this.add(objects.objectAt(idx)) ;
    } else if (objects.isEnumerable) {
      objects.forEach(function(idx) { this.add(idx); }, this);
    }
    this.endPropertyChanges();
    
    return this ;
  },  

  /**
    Removes all the ranges in the passed array.
  */
  removeEach: function(objects) {
    if (this.isFrozen) throw hub.FROZEN_ERROR;

    this.beginPropertyChanges();
    
    var idx = objects.get('length') ;
    if (objects.isHubArray) {
      while(--idx >= 0) this.remove(objects.objectAt(idx)) ;
    } else if (objects.isEnumerable) {
      objects.forEach(function(idx) { this.remove(idx); }, this); 
    }
    
    this.endPropertyChanges();
    
    return this ;
  },  

  /**
   Clones the set into a new set.  
  */
  clone: function() {
    return hub.IndexSet.create(this);    
  },
  
  /**
    Returns a string describing the internal range structure.  Useful for
    debugging.
    
    @returns {String}
  */
  inspect: function() {
    var content = this._hub_content,
        len     = content.length,
        idx     = 0,
        ret     = [],
        item;
    
    for(idx=0;idx<len;idx++) {
      item = content[idx];
      if (item !== undefined) ret.push(hub.fmt("%@:%@", idx,item));      
    }
    return hub.fmt("hub.IndexSet<%@>", ret.join(' , '));
  },
  
  /** 
    Invoke the callback, passing each occuppied range instead of each 
    index.  This can be a more efficient way to iterate in some cases.  The
    callback should have the signature:
    
    {{{
      callback(start, length, indexSet, source) { ... }
    }}}
    
    If you pass a target as a second option, the callback will be called in
    the target context.
    
    @param {Function} callback the iterator callback
    @param {Object} target the target
    @returns {hub.IndexSet} receiver
  */
  forEachRange: function(callback, target) {
    var content = this._hub_content,
        cur     = 0,
        next    = content[cur],
        source  = this.source;

    if (target === undefined) target = null ;
    while (next !== 0) {
      if (next > 0) callback.call(target, cur, next - cur, this, source);
      cur  = Math.abs(next);
      next = content[cur];
    }
    
    return this ;
  },    
  
  /**
    Invokes the callback for each index within the passed start/length range.
    Otherwise works just like regular forEach().
    
    @param {Number} start starting index
    @param {Number} length length of range
    @param {Function} callback
    @param {Object} target
    @returns {hub.IndexSet} receiver
  */
  forEachIn: function(start, length, callback, target) {
    var content = this._hub_content,
        cur     = 0,
        idx     = 0,
        lim     = start + length,
        source  = this.source,
        next    = content[cur];

    if (target === undefined) target = null ;
    while (next !== 0) {
      if (cur < start) cur = start ; // skip forward 
      while((cur < next) && (cur < lim)) { 
        callback.call(target, cur++, idx++, this, source); 
      }
      
      if (cur >= lim) {
        cur = next = 0 ;
      } else {
        cur  = Math.abs(next);
        next = content[cur];
      }
    }
    return this ;
  },

  /**
    Total number of indexes within the specified range.
    
    @param {Number|hub.IndexSet} start index, range object or IndexSet
    @param {Number} length optional range length
    @returns {Number} count of indexes
  */
  lengthIn: function(start, length) {

    var ret = 0 ;
    
    // normalize input
    if (length === undefined) { 
      if (start === null || start === undefined) {
        return 0; // nothing to do

      } else if (typeof start === hub.T_NUMBER) {
        length = 1 ;
        
      // if passed an index set, just add each range in the index set.
      } else if (start.isIndexSet) {
        start.forEachRange(function(start, length) { 
          ret += this.lengthIn(start, length);
        }, this);
        return ret;
        
      } else {
        length = start.length; 
        start = start.start;
      }
    }

    // fast path
    if (this.get('length') === 0) return 0;
    
    var content = this._hub_content,
        cur     = 0,
        next    = content[cur],
        lim     = start + length ;

    while (cur<lim && next !== 0) {
      if (next>0) {
        ret += (next>lim) ? lim-cur : next-cur;
      }
      cur  = Math.abs(next);
      next = content[cur];
    }
    
    return ret ;
  },
  
  // ..........................................................
  // OBJECT API
  // 
  
  /**
    Optionally set the source property on an index set and then you can 
    iterate over the actual object values referenced by the index set.  See
    indexOf(), lastIndexOf(), forEachObject(), addObject() and removeObject().
  */
  source: null,
  
  /**
    Returns the first index in the set that matches the passed object.  You
    must have a source property on the set for this to work.
    
    @param {Object} object the object to check 
    @param {Number} startAt optional starting point
    @returns {Number} found index or -1 if not in set
  */
  indexOf: function(object, startAt) {
    var source  = this.source;
    if (!source) throw hub.fmt("%@.indexOf() requires source", this);
    
    var len     = source.get('length'),
        
        // start with the first index in the set
        content = this._hub_content,
        cur     = content[0]<0 ? Math.abs(content[0]) : 0,
        idx ;
        
    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx<0) return -1 ; // not found in source
      if (this.contains(idx)) return idx; // found in source and in set.
      cur = idx+1;
    } 
    
    return -1; // not found
  },

  /**
    Returns the last index in the set that matches the passed object.  You
    must have a source property on the set for this to work.
    
    @param {Object} object the object to check 
    @param {Number} startAt optional starting point
    @returns {Number} found index or -1 if not in set
  */
  lastIndexOf: function(object, startAt) {
    var source  = this.source;
    if (!source) throw hub.fmt("%@.lastIndexOf() requires source", this);
    
    // start with the last index in the set
    var len     = source.get('length'),
        cur     = this.max-1,
        idx ;

    if (cur >= len) cur = len-1;
    while (cur>=0) {
      idx = source.lastIndexOf(object, cur);
      if (idx<0) return -1 ; // not found in source
      if (this.contains(idx)) return idx; // found in source and in set.
      cur = idx+1;
    } 
    
    return -1; // not found
  },
  
  /**
    Iterates through the objects at each index location in the set.  You must
    have a source property on the set for this to work.  The callback you pass
    will be invoked for each object in the set with the following signature:
    
    {{{
      function callback(object, index, source, indexSet) { ... }
    }}}
    
    If you pass a target, it will be used when the callback is called.
    
    @param {Function} callback function to invoke.  
    @param {Object} target optional content. otherwise uses window
    @returns {hub.IndexSet} receiver
  */ 
  forEachObject: function(callback, target) {
    var source  = this.source;
    if (!source) throw hub.fmt("%@.forEachObject() requires source", this);

    var content = this._hub_content,
        cur     = 0,
        idx     = 0,
        next    = content[cur];
        
    if (target === undefined) target = null ;
    while (next !== 0) {
      
      while(cur < next) { 
        callback.call(target, source.objectAt(cur), cur, source, this); 
        cur++;
      }
      
      cur  = Math.abs(next);
      next = content[cur];
    }
    return this ;
  },
  
  /**
    Adds all indexes where the object appears to the set.  If firstOnly is 
    passed, then it will find only the first index and add it.  If  you know
    the object only appears in the source array one time, firstOnly may make
    this method faster.
    
    Requires source to work.
    
    @param {Object} object the object to add
    @returns {hub.IndexSet} receiver
  */
  addObject: function(object, firstOnly) {
    var source  = this.source;
    if (!source) throw hub.fmt("%@.addObject() requires source", this);

    var len = source.get('length'),
        cur = 0, idx;
        
    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx >= 0) { 
        this.add(idx);
        if (firstOnly) return this ;
        cur = idx++;
      } else return this ;
    }
    return this ;    
  },

  /**
    Adds any indexes matching the passed objects.  If firstOnly is passed, 
    then only finds the first index for each object.
    
    @param {hub.Enumerable} objects the objects to add
    @returns {hub.IndexSet} receiver
  */
  addObjects: function(objects, firstOnly) {
    objects.forEach(function(object) {
      this.addObject(object, firstOnly);
    }, this);
    return this;
  },
  
  /**
    Removes all indexes where the object appears to the set.  If firstOnly is 
    passed, then it will find only the first index and add it.  If  you know
    the object only appears in the source array one time, firstOnly may make
    this method faster.
    
    Requires source to work.
    
    @param {Object} object the object to add
    @returns {hub.IndexSet} receiver
  */
  removeObject: function(object, firstOnly) {
    var source  = this.source;
    if (!source) throw hub.fmt("%@.removeObject() requires source", this);

    var len = source.get('length'),
        cur = 0, idx;
        
    while(cur>=0 && cur<len) {
      idx = source.indexOf(object, cur);
      if (idx >= 0) { 
        this.remove(idx);
        if (firstOnly) return this ;
        cur = idx+1;
      } else return this ;
    }
    return this ;    
  },

  /**
    Removes any indexes matching the passed objects.  If firstOnly is passed, 
    then only finds the first index for each object.
    
    @param {hub.Enumerable} objects the objects to add
    @returns {hub.IndexSet} receiver
  */
  removeObjects: function(objects, firstOnly) {
    objects.forEach(function(object) {
      this.removeObject(object, firstOnly);
    }, this);
    return this;
  },
  
  
  // .......................................
  // PRIVATE 
  //

  /** 
    Usually observing notifications from IndexSet are not useful, so 
    supress them by default.
    
    @property {Boolean}
  */
  LOG_OBSERVING: false,
  
  /** @private - optimized call to forEach() */
  forEach: function(callback, target) {
    var content = this._hub_content,
        cur     = 0,
        idx     = 0,
        source  = this.source,
        next    = content[cur];

    if (target === undefined) target = null ;
    while (next !== 0) {
      while(cur < next) { 
        callback.call(target, cur++, idx++, this, source); 
      }
      cur  = Math.abs(next);
      next = content[cur];
    }
    return this ;
  },
  
  /** @private - support iterators */
  nextObject: function(ignore, idx, context) {
    var content = this._hub_content,
        next    = context.next,
        max     = this.get('max'); // next boundary
    
    // seed.
    if (idx === null) {
      idx = next = 0 ;

    } else if (idx >= max) {
      delete context.next; // cleanup context
      return null ; // nothing left to do

    } else idx++; // look on next index
    
    // look for next non-empty range if needed.
    if (idx === next) {
      do { 
        idx = Math.abs(next);
        next = content[idx];
      } while(next < 0);
      context.next = next;
    }
    
    return idx;
  },
  
  toString: function() {
    var str = [];
    this.forEachRange(function(start, length) {
      str.push(length === 1 ? start : hub.fmt("%@..%@", start, start + length - 1));
    }, this);
    return hub.fmt("hub.IndexSet<%@>", str.join(',')) ;
  },
  
  max: 0

}) ;

hub.IndexSet.slice = hub.IndexSet.copy = hub.IndexSet.clone ;
hub.IndexSet.EMPTY = hub.IndexSet.create().freeze();
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  A lazily-filled array.  A SparseArray makes it easy for you to create 
  very large arrays of data but then to defer actually populating that array
  until it is actually needed.  This is often much faster than generating an
  array up front and paying the cost to load your data then.
  
  Although technically all arrays in JavaScript are "sparse" (in the sense 
  that you can read and write properties are arbitrary indexes), this array
  keeps track of which elements in the array have been populated already 
  and which ones have not.  If you try to get a value at an index that has 
  not yet been populated, the SparseArray will notify a delegate object first
  giving the delegate a chance to populate the component.
  
  Most of the time, you will use a SparseArray to incrementally load data 
  from the server.  For example, if you have a contact list with 3,000
  contacts in it, you may create a SparseArray with a length of 3,000 and set
  that as the content for a ListView.  As the ListView tries to display the
  visible contacts, it will request them from the SparseArray, which will in
  turn notify your delegate, giving you a chance to load the contact data from
  the server.
  
  FIXME: Rename as hub.LazyArray.
  
  @class
  @extends hub.Enumerable
  @extends hub.Array
  @extends hub.Observable
  @extends hub.DelegateSupport
*/

hub.SparseArray = hub.Object.extend(hub.Observable, hub.Enumerable, hub.Array, 
  hub.DelegateSupport, /** @scope hub.SparseArray.prototype */ {  

  // ..........................................................
  // LENGTH SUPPORT
  // 

  _hub_requestingLength: 0,
  _hub_requestingIndex: 0,
   
  /**
    The length of the sparse array.  The delegate for the array should set 
    this length.
    
    @property {Number}
  */
  length: function() {
    var del = this.delegate ;
    if (del && hub.none(this._hub_length) && del.sparseArrayDidRequestLength) {
      this._hub_requestingLength++ ;
      del.sparseArrayDidRequestLength(this);
      this._hub_requestingLength-- ;
    }
    return this._hub_length || 0 ;
  }.property().cacheable(),

  /**
    Call this method from a delegate to provide a length for the sparse array.
    If you pass null for this property, it will essentially "reset" the array
    causing your delegate to be called again the next time another object 
    requests the array length.
  
    @param {Number} length the length or null
    @returns {hub.SparseArray} receiver
  */
  provideLength: function(length) {
    if (hub.none(length)) this._hub_sa_content = null ;
    if (length !== this._hub_length) {
      this._hub_length = length ;
      if (this._hub_requestingLength <= 0) this.enumerableContentDidChange() ;
    }
    return this ;
  },

  // ..........................................................
  // READING CONTENT 
  // 

  /** 
    The minimum range of elements that should be requested from the delegate.
    If this value is set to larger than 1, then the sparse array will always
    fit a requested index into a range of this size and request it.
    
    @property {Number}
  */
  rangeWindowSize: 1,
  
  /*
    This array contains all the start_indexes of ranges requested. This is to 
    avoid calling sparseArrayDidRequestRange too often. Indexes are removed and 
    added as range requests are completed.
  */
  requestedRangeIndex: [],
  
  /** 
    Returns the object at the specified index.  If the value for the index
    is currently undefined, invokes the didRequestIndex() method to notify
    the delegate.
    
    @param  {Number} idx the index to get
    @return {Object} the object
  */
  objectAt: function(idx) {
    var content = this._hub_sa_content, ret ;
    if (!content) content = this._hub_sa_content = [] ;
    if ((ret = content[idx]) === undefined) {
      this.requestIndex(idx);
      ret = content[idx]; // just in case the delegate provided immediately
    }
    return ret ;
  },

  /**
    Returns the set of indexes that are currently defined on the sparse array.
    If you pass an optional index set, the search will be limited to only 
    those indexes.  Otherwise this method will return an index set containing
    all of the defined indexes.  Currently this can be quite expensive if 
    you have a lot of indexes defined.
    
    @param {hub.IndexSet} indexes optional from indexes
    @returns {hub.IndexSet} defined indexes
  */
  definedIndexes: function(indexes) {
    var ret = hub.IndexSet.create(),
        content = this._hub_sa_content,
        idx, len;
        
    if (!content) return ret.freeze(); // nothing to do
    
    if (indexes) {
      indexes.forEach(function(idx) { 
        if (content[idx] !== undefined) ret.add(idx);
      });
    } else {      
      len = content.length;
      for(idx=0;idx<len;idx++) {
        if (content[idx] !== undefined) ret.add(idx);
      }
    }
    
    return ret.freeze();
  },
  
  _hub_TMP_RANGE: {},
  
  /**
    Called by objectAt() whenever you request an index that has not yet been
    loaded.  This will possibly expand the index into a range and then invoke
    an appropriate method on the delegate to request the data.
    
    It will check if the range has been already requested.
    
    @param {Number} idx the index to retrieve
    @returns {hub.SparseArray} receiver
  */
  requestIndex: function(idx) {
    var del = this.delegate;
    if (!del) return this; // nothing to do
    
    // adjust window
    var len = this.get('rangeWindowSize'), start = idx;
    if (len > 1) start = start - Math.floor(start % len);
    if (len < 1) len = 1 ;
    
    // invoke appropriate callback
    this._hub_requestingIndex++;
    if (del.sparseArrayDidRequestRange) {
      var range = this._hub_TMP_RANGE;
      if(this.wasRangeRequested(start)===-1){
        range.start = start;
        range.length = len;
        del.sparseArrayDidRequestRange(this, range);
        this.requestedRangeIndex.push(start);
      }
    } else if (del.sparseArrayDidRequestIndex) {
      while(--len >= 0) del.sparseArrayDidRequestIndex(this, start + len);
    }
    this._hub_requestingIndex--;

    return this ;
  },
  
  /*
    This method is called by requestIndex to check if the range has already 
    been requested. We assume that rangeWindowSize is not changed often.
    
     @param {Number} startIndex
     @return {Number} index in requestRangeIndex
  */
  wasRangeRequested: function(rangeStart) {
    var i, ilen;
    for(i=0, ilen=this.requestedRangeIndex.length; i<ilen; i++){
      if(this.requestedRangeIndex[i]===rangeStart) return i;
    }
    return -1;
  },
  
  /*
    This method has to be called after a request for a range has completed.
    To remove the index from the sparseArray to allow future updates on the 
    range.
    
     @param {Number} startIndex
     @return {Number} index in requestRangeIndex
  */
  rangeRequestCompleted: function(start) { 
    var i = this.wasRangeRequested(start);
    if(i>=0) { 
      this.requestedRangeIndex.removeAt(i,1);
      return true;
    }
    return false;
  },
  
  /**
    This method sets the content for the specified to the objects in the 
    passed array.  If you change the way SparseArray implements its internal
    tracking of objects, you should override this method along with 
    objectAt().
    
    @param {Range} range the range to apply to
    @param {Array} array the array of objects to insert
    @returns {hub.SparseArray} reciever
  */
  provideObjectsInRange: function(range, array) {
    var content = this._hub_sa_content ;
    if (!content) content = this._hub_sa_content = [] ;
    var start = range.start, len = range.length;
    while(--len >= 0) content[start+len] = array[len];
    if (this._hub_requestingIndex <= 0) this.enumerableContentDidChange() ;
    return this ;
  },

  _hub_TMP_PROVIDE_ARRAY: [],
  _hub_TMP_PROVIDE_RANGE: { length: 1 },
  
  /**
    Convenience method to provide a single object at a specified index.  Under
    the covers this calls provideObjectsInRange() so you can override only 
    that method and this one will still work.
    
    @param {Number} index the index to insert
    @param {Object} the object to insert
    @return {hub.SparseArray} receiver
  */
  provideObjectAtIndex: function(index, object) {
    var array = this._hub_TMP_PROVIDE_ARRAY, range = this._hub_TMP_PROVIDE_RANGE;
    array[0] = object;
    range.start = index;
    return this.provideObjectsInRange(range, array);
  },

  /**
    Invalidates the array content in the specified range.  This is not the 
    same as editing an array.  Rather it will cause the array to reload the
    content from the delegate again when it is requested.
    
    @param {Range} the range
    @returns {hub.SparseArray} receiver
  */
  objectsDidChangeInRange: function(range) {

    // delete cached content
    var content = this._hub_sa_content ;
    if (content) {
      // if range covers entire length of cached content, just reset array
      if (range.start === 0 && hub.maxRange(range)>=content.length) {
        this._hub_sa_content = null ;
        
      // otherwise, step through the changed parts and delete them.
      } else {
        var start = range.start, loc = Math.min(start + range.length, content.length);
        while (--loc>=start) content[loc] = undefined;
      }
    }    
    this.enumerableContentDidChange(range) ; // notify
    return this ;
  },
  
  /**
    Optimized version of indexOf().  Asks the delegate to provide the index 
    of the specified object.  If the delegate does not implement this method
    then it will search the internal array directly.
    
    @param {Object} obj the object to search for
    @returns {Number} the discovered index or -1 if not found
  */
  indexOf: function(obj) {
    var del = this.delegate ;
    if (del && del.sparseArrayDidRequestIndexOf) {
      return del.sparseArrayDidRequestIndexOf(this, obj);
    } else {
      var content = this._hub_sa_content ;
      if (!content) content = this._hub_sa_content = [] ;
      return content.indexOf(obj) ;
    }
  },  
  
  // ..........................................................
  // EDITING
  // 

  /**
    Array primitive edits the objects at the specified index unless the 
    delegate rejects the change.
    
    @param {Number} idx the index to begin to replace
    @param {Number} amt the number of items to replace
    @param {Array} objects the new objects to set instead
    @returns {hub.SparseArray} receiver
  */
  replace: function(idx, amt, objects) {
    objects = objects || [] ;

    // if we have a delegate, get permission to make the replacement.
    var del = this.delegate ;
    if (del) {
      if (!del.sparseArrayShouldReplace || 
          !del.sparseArrayShouldReplace(this, idx, amt, objects)) {
            return this;
      }
    }

    // go ahead and apply to local content.
    var content = this._hub_sa_content ;
    if (!content) content = this._hub_sa_content = [] ;
    content.replace(idx, amt, objects) ;
    
    // update length
    var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;
    var delta = len - amt ;
    if (!hub.none(this._hub_length)) {
      this.propertyWillChange('length');
      this._hub_length += delta;
      this.propertyDidChange('length');
    }

    this.enumerableContentDidChange(idx, amt, delta) ;
    return this ;
  },

  /** 
    Resets the SparseArray, causing it to reload its content from the 
    delegate again.
    
    @returns {hub.SparseArray} receiver
  */
  reset: function() {
    this._hub_sa_content = null ;
    this._hub_length = null ;
    this.enumerableContentDidChange() ;
    this.invokeDelegateMethod(this.delegate, 'sparseArrayDidReset', this);
    return this ;
  }
      
}) ;

/** 
  Convenience metohd returns a new sparse array with a default length already 
  provided.
  
  @param {Number} len the length of the array
  @returns {hub.SparseArray}
*/
hub.SparseArray.array = function(len) {
  return this.create({ _hub_length: len||0 });
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  @class
  @extend hub.Object
*/
hub.DataSource = hub.Object.extend(
/** @scope hub.DataSource.prototype */ {

  // ..........................................................
  // hub.Store ENTRY POINTS
  // 
  

  /**
  
    Invoked by the store whenever it needs to retrieve data matching a 
    specific query, triggered by find().  This method is called anytime
    you invoke hub.Store#find() with a query or hub.RecordArray#refresh().  You 
    should override this method to actually retrieve data from the server 
    needed to fulfill the query.  If the query is a remote query, then you 
    will also need to provide the contents of the query as well.
    
    h3. Handling Local Queries
    
    Most queries you create in your application will be local queries.  Local
    queries are populated automatically from whatever data you have in memory.
    When your fetch() method is called on a local queries, all you need to do
    is load any records that might be matched by the query into memory. 
    
    The way you choose which queries to fetch is up to you, though usually it
    can be something fairly straightforward such as loading all records of a
    specified type.
    
    When you finish loading any data that might be required for your query, 
    you should always call hub.Store#dataSourceDidFetchQuery() to put the query 
    back into the READY state.  You should call this method even if you choose
    not to load any new data into the store in order to notify that the store
    that you think it is ready to return results for the query.
    
    h3. Handling Remote Queries
    
    Remote queries are special queries whose results will be populated by the
    server instead of from memory.  Usually you will only need to use this 
    type of query when loading large amounts of data from the server.
    
    Like Local queries, to fetch a remote query you will need to load any data
    you need to fetch from the server and add the records to the store.  Once
    you are finished loading this data, however, you must also call
    hub.Store#loadQueryResults() to actually set an array of storeKeys that
    represent the latest results from the server.  This will implicitly also
    call datasSourceDidFetchQuery() so you don't need to call this method 
    yourself.
    
    If you want to support incremental loading from the server for remote 
    queries, you can do so by passing a hub.SparseArray instance instead of 
    a regular array of storeKeys and then populate the sparse array on demand.
    
    h3. Handling Errors and Cancelations
    
    If you encounter an error while trying to fetch the results for a query 
    you can call hub.Store#dataSourceDidErrorQuery() instead.  This will put
    the query results into an error state.  
    
    If you had to cancel fetching a query before the results were returned, 
    you can instead call hub.Store#dataSourceDidCancelQuery().  This will set 
    the query back into the state it was in previously before it started 
    loading the query.
    
    h3. Return Values
    
    When you return from this method, be sure to return a Boolean.  true means
    you handled the query, false means you can't handle the query.  When using
    a cascading data source, returning false will mean the next data source will
    be asked to fetch the same results as well.
    
    @param {hub.Store} store the requesting store
    @param {hub.Query} query query describing the request
    @returns {Boolean} true if you can handle fetching the query, false otherwise
  */
  fetch: function(store, query) {
    return false ; // do not handle anything!
  },
  
  /**
    Called by the store whenever it needs to load a specific set of store 
    keys.  The default implementation will call retrieveRecord() for each
    storeKey.  
    
    You should implement either retrieveRecord() or retrieveRecords() to 
    actually fetch the records referenced by the storeKeys .
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKeys
    @param {Array} ids - optional
    @returns {Boolean} true if handled, false otherwise
  */
  retrieveRecords: function(store, storeKeys, ids) {
    return this._hub_handleEach(store, storeKeys, this.retrieveRecord, ids);  
  },
  
  /**
    Invoked by the store whenever it has one or more records with pending 
    changes that need to be sent back to the server.  The store keys will be
    separated into three categories:
    
     - createStoreKeys: records that need to be created on server
     - updateStoreKeys: existing records that have been modified
     - destroyStoreKeys: records need to be destroyed on the server
     
    If you do not override this method yourself, this method will actually
    invoke createRecords(), updateRecords(), and destroyRecords() on the 
    dataSource, passing each array of storeKeys.  You can usually implement
    those methods instead of overriding this method.
    
    However, if your server API can sync multiple changes at once, you may
    prefer to override this method instead.
    
    To support cascading data stores, be sure to return false if you cannot 
    handle any of the keys, true if you can handle all of the keys, or
    hub.MIXED_STATE if you can handle some of them.

    @param {hub.Store} store the requesting store
    @param {Array} createStoreKeys keys to create
    @param {Array} updateStoreKeys keys to update
    @param {Array} destroyStoreKeys keys to destroy
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} true if data source can handle keys
  */
  commitRecords: function(store, createStoreKeys, updateStoreKeys, destroyStoreKeys, params) {
    var cret, uret, dret;
    if (createStoreKeys.length>0) {
      cret = this.createRecords.call(this, store, createStoreKeys, params);
    }
        
    if (updateStoreKeys.length>0) {
      uret = this.updateRecords.call(this, store, updateStoreKeys, params); 
    }
       
    if (destroyStoreKeys.length>0) {
      dret = this.destroyRecords.call(this, store, destroyStoreKeys, params);
    }
     
    return ((cret === uret) && (cret === dret)) ? cret : hub.MIXED_STATE;
  },
  
  /**
    Invoked by the store whenever it needs to cancel one or more records that
    are currently in-flight.  If any of the storeKeys match records you are
    currently acting upon, you should cancel the in-progress operation and 
    return true.
    
    If you implement an in-memory data source that immediately services the
    other requests, then this method will never be called on your data source.
    
    To support cascading data stores, be sure to return false if you cannot 
    retrieve any of the keys, true if you can retrieve all of the, or
    hub.MIXED_STATE if you can retrieve some of the.
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKeys array of storeKeys to retrieve
    @returns {Boolean} true if data source can handle keys
  */
  cancel: function(store, storeKeys) {
    return false;
  },
  
  // ..........................................................
  // BULK RECORD ACTIONS
  // 
  
  /**
    Called from commitRecords() to commit modified existing records to the 
    store.  You can override this method to actually send the updated 
    records to your store.  The default version will simply call 
    updateRecord() for each storeKey.

    To support cascading data stores, be sure to return false if you cannot 
    handle any of the keys, true if you can handle all of the keys, or
    hub.MIXED_STATE if you can handle some of them.

    @param {hub.Store} store the requesting store
    @param {Array} storeKeys keys to update
    @param {Hash} params 
      to be passed down to data source. originated from the commitRecords() 
      call on the store

    @returns {Boolean} true, false, or hub.MIXED_STATE  

  */
  updateRecords: function(store, storeKeys, params) {
    return this._hub_handleEach(store, storeKeys, this.updateRecord, null, params);
  },
  
  /**
    Called from commitRecords() to commit newly created records to the 
    store.  You can override this method to actually send the created 
    records to your store.  The default version will simply call 
    createRecord() for each storeKey.

    To support cascading data stores, be sure to return false if you cannot 
    handle any of the keys, true if you can handle all of the keys, or
    hub.MIXED_STATE if you can handle some of them.

    @param {hub.Store} store the requesting store
    @param {Array} storeKeys keys to update
    
    @param {Hash} params 
      to be passed down to data source. originated from the commitRecords() 
      call on the store
    
    @returns {Boolean} true, false, or hub.MIXED_STATE  
  
  */
  createRecords: function(store, storeKeys, params) {
    return this._hub_handleEach(store, storeKeys, this.createRecord, null, params);
  },

  /**
    Called from commitRecords() to commit destroted records to the 
    store.  You can override this method to actually send the destroyed 
    records to your store.  The default version will simply call 
    destroyRecord() for each storeKey.

    To support cascading data stores, be sure to return false if you cannot 
    handle any of the keys, true if you can handle all of the keys, or
    hub.MIXED_STATE if you can handle some of them.

    @param {hub.Store} store the requesting store
    @param {Array} storeKeys keys to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store

    @returns {Boolean} true, false, or hub.MIXED_STATE  

  */
  destroyRecords: function(store, storeKeys, params) {
    return this._hub_handleEach(store, storeKeys, this.destroyRecord, null, params);
  },

  /** @private
    invokes the named action for each store key.  returns proper value
  */
  _hub_handleEach: function(store, storeKeys, action, ids, params) {
    var len = storeKeys.length, idx, ret, cur, lastArg;
    if(!ids) ids = [];
    
    for(idx=0;idx<len;idx++) {
      lastArg = ids[idx] ? ids[idx] : params;
      
      cur = action.call(this, store, storeKeys[idx], lastArg, params);
      if (ret === undefined) {
        ret = cur ;
      } else if (ret === true) {
        ret = (cur === true) ? true : hub.MIXED_STATE ;
      } else if (ret === false) {
        ret = (cur === false) ? false : hub.MIXED_STATE ;
      }
    }
    return ret ? ret : null ;
  },
  

  // ..........................................................
  // SINGLE RECORD ACTIONS
  // 
  
  /**
    Called from updatesRecords() to update a single record.  This is the 
    most basic primitive to can implement to support updating a record.
    
    To support cascading data stores, be sure to return false if you cannot 
    handle the passed storeKey or true if you can.
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} true if handled
  */
  updateRecord: function(store, storeKey, params) {
    return false ;
  },

  /**
    Called from retrieveRecords() to retrieve a single record.
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKey key to retrieve
    @param {String} id the id to retrieve
    @returns {Boolean} true if handled
  */
  retrieveRecord: function(store, storeKey, id) {
    return false ;
  },

  /**
    Called from createdRecords() to created a single record.  This is the 
    most basic primitive to can implement to support creating a record.
    
    To support cascading data stores, be sure to return false if you cannot 
    handle the passed storeKey or true if you can.
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} true if handled
  */
  createRecord: function(store, storeKey, params) {
    return false ;
  },

  /**
    Called from destroyRecords() to destroy a single record.  This is the 
    most basic primitive to can implement to support destroying a record.
    
    To support cascading data stores, be sure to return false if you cannot 
    handle the passed storeKey or true if you can.
    
    @param {hub.Store} store the requesting store
    @param {Array} storeKey key to update
    @param {Hash} params to be passed down to data source. originated
      from the commitRecords() call on the store
    @returns {Boolean} true if handled
  */
  destroyRecord: function(store, storeKey, params) {
    return false ;
  }  
    
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  hub.CascadeDataSource forwards requests onto an array of additional data 
  sources, stopping when one of the data sources returns true, indicating that 
  it handled the request.
  
  You can use a cascade data source to tie together multiple data sources,
  treating them as if they were a single, combined data source.
  
  h2. Configuring a Cascade Data Source
  
  You will usually define your cascadie data source in your main() method after
  all the classes you have are loaded.
  
  {{{
    MyApp.dataSource = hub.CascadeDataSource.create({
      dataSources: hub.w("prefs youtube photos"),
      
      prefs:   MyApp.PrefsDataSource.create({ root: "/prefs" }),
      youtube: YouTube.YouTubeDataSource.create({ apiKey: "123456" }),
      photos:  MyApp.PhotosDataSource.create({ root: "photos" })
      
    });
    
    MyApp.store.set('dataSource', MyApp.dataSource);
  }}}
  
  Note that the order you define your dataSources property will determine the
  order in which requests will cascade from the store.
  
  Alternatively, you can use a more jQuery-like API for defining your data
  sources:
  
  {{{
    MyApp.dataSource = hub.CascadeDataSource.create()
      .from(MyApp.PrefsDataSource.create({ root: "/prefs" }))
      .from(YouTube.YouTubeDataSource.create({ apiKey: "123456" }))
      .from(MyApp.PhotosDataSource.create({ root: "photos" }));

    MyApp.store.set('dataSource', MyApp.dataSource);
  }}}

  In this case, the order you call from() will determine the order the request
  will cascade.
  
  @class
  @extends hub.DataSource
*/
hub.CascadeDataSource = hub.DataSource.extend( 
  /** @scope hub.CascadeDataSource.prototype */ {

  /**
    The data sources used by the cascade, in the order that they are to be 
    followed.  Usually when you define the cascade, you will define this
    array.
    
    @property {Array}
  */
  dataSources: null,

  /**
    Add a data source to the list of sources to use when cascading.  Used to
    build the data source cascade effect.

    @param {hub.DataSource} dataSource a data source instance to add.
    @returns {hub.CascadeDataSource} receiver
  */
  from: function(dataSource) {
    var dataSources = this.get('dataSources');
    if (!dataSources) this.set('dataSources', dataSources = []);
    dataSources.push(dataSource);
    return this ;
  },
    
  // ..........................................................
  // hub.Store ENTRY POINTS
  // 
  
  /** @private - just cascades */
  fetch: function(store, query) {
    var sources = this.get('dataSources'), 
        len     = sources ? sources.length : 0,
        ret     = false,
        cur, source, idx;
    
    for(idx=0; (ret !== true) && idx<len; idx++) {
      source = sources.objectAt(idx);
      cur = source.fetch ? source.fetch.call(source, store, query) : false;
      ret = this._hub_handleResponse(ret, cur);
    }
    
    return ret ;
  },
  
  
  /** @private - just cascades */
  retrieveRecords: function(store, storeKeys) {
    var sources = this.get('dataSources'), 
        len     = sources ? sources.length : 0,
        ret     = false,
        cur, source, idx;
    
    for(idx=0; (ret !== true) && idx<len; idx++) {
      source = sources.objectAt(idx);
      cur = source.retrieveRecords.call(source, store, storeKeys);
      ret = this._hub_handleResponse(ret, cur);
    }
    
    return ret ;
  },

  /** @private - just cascades */
  commitRecords: function(store, createStoreKeys, updateStoreKeys, destroyStoreKeys) {
    var sources = this.get('dataSources'), 
        len     = sources ? sources.length : 0,
        ret     = false,
        cur, source, idx;
    
    for(idx=0; (ret !== true) && idx<len; idx++) {
      source = sources.objectAt(idx);
      cur = source.commitRecords.call(source, store, createStoreKeys, updateStoreKeys, destroyStoreKeys);
      ret = this._hub_handleResponse(ret, cur);
    }
    
    return ret ;
  },

  /** @private - just cascades */
  cancel: function(store, storeKeys) {
    var sources = this.get('dataSources'), 
        len     = sources ? sources.length : 0,
        ret     = false,
        cur, source, idx;
    
    for(idx=0; (ret !== true) && idx<len; idx++) {
      source = sources.objectAt(idx);
      cur = source.cancel.call(source, store, storeKeys);
      ret = this._hub_handleResponse(ret, cur);
    }
    
    return ret ;
  },
  
  // ..........................................................
  // INTERNAL SUPPORT
  // 
  
  /** @private */
  init: function() {
    arguments.callee.base.apply(this, arguments) ;
    
    // if a dataSources array is defined, look for any strings and lookup 
    // the same on the data source.  Replace.
    var sources = this.get('dataSources'),
        idx     = sources ? sources.get('length') : 0,
        source;
    while(--idx>=0) {
      source = sources[idx];
      if (hub.typeOf(source) === hub.T_STRING) sources[idx] = this.get(source);
    }
    
  },

  /** @private - Determine the proper return value. */
  _hub_handleResponse: function(current, response) {
    if (response === true) return true ;
    else if (current === false) return (response === false) ? false : hub.MIXED_STATE ;
    else return hub.MIXED_STATE ;
  }
    
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  hub.Record is the core model class in hub.js. It is analogous to 
  NSManagedObject in Core Data and EOEnterpriseObject in the Enterprise Objects 
  Framework (aka WebObjects), or ActiveRecord::Base in Rails.
  
  The hub.Record 'attributes' hash is used to store the values of a record in a 
  format that can be easily passed to/from the server.  The values should 
  generally be stored in their raw string form.  References to external records 
  should be stored as primary keys.
  
  Normally you do not need to work with the attributes hash directly.  Instead 
  you should use get/set on normal record properties.  If the property is not 
  defined on the object, then the record will check the attributes hash instead.
  
  You can bulk update attributes from the server using the updateAttributes() 
  method.
  
  @class
  @extends hub.Object
*/
hub.Record = hub.Object.extend(
/** @scope hub.Record.prototype */ {
  
  /**  
    Walk like a duck
  
    @property {Boolean}
  */
  isRecord: true,
  
  // ...............................
  // PROPERTIES
  //
  
  /**
    This is the primary key used to distinguish records.  If the keys match, 
    the records are assumed to be identical.
    
    @property {String}
  */
  primaryKey: 'id',
  
  /**
    Returns the id for the record instance.  The id is used to uniquely 
    identify this record instance from all others of the same type.  If you 
    have a primaryKey set on this class, then the id will be the value of the
    primaryKey property on the underlying JSON hash.
    
    @property {String}
  */
  id: function(key, value) {
    if (value !== undefined) {
      this.writeAttribute(this.get('primaryKey'), value);
      return value;
    } else {
      return hub.Store.idFor(this.storeKey);
    }
  }.property('storeKey').cacheable(),
  
  /**
    All records generally have a life cycle as they are created or loaded into 
    memory, modified, committed and finally destroyed.  This life cycle is 
    managed by the status property on your record. 

    The status of a record is modelled as a finite state machine.  Based on the 
    current state of the record, you can determine which operations are 
    currently allowed on the record and which are not.
    
    In general, a record can be in one of five primary states; hub.Record.EMPTY,
    hub.Record.BUSY, hub.Record.READY, hub.Record.DESTROYED, hub.Record.ERROR. 
    These are all described in more detail in the class mixin (below) where 
    they are defined.
    
    @property {Number}
  */
  status: function() {
    var store = this.get('store') ;
    if (!store) return hub.Record.EMPTY ;
    return store.readStatus(this.storeKey) ;
  }.property('storeKey').cacheable(),

  /**
    The store that owns this record.  All changes will be buffered into this
    store and committed to the rest of the store chain through here.
    
    This property is set when the record instance is created and should not be
    changed or else it will break the record behavior.
    
    @property {hub.Store}
  */
  store: null,

  /**
    This is the store key for the record, it is used to link it back to the 
    dataHash. If a record is reused, this value will be replaced.
    
    You should not edit this store key but you may sometimes need to refer to
    this store key when implementing a Server object.
    
    @property {Number}
  */
  storeKey: null,

  /** 
    true when the record has been destroyed
    
    @property {Boolean}
  */
  isDestroyed: function() {
    return !!(this.get('status') & hub.Record.DESTROYED);  
  }.property('status').cacheable(),
  
  /**
    true when the record is in an editable state.  You can use this property to
    quickly determine whether attempting to modify the record would raise an 
    exception or not.
    
    This property is both readable and writable.  Note however that if you 
    set this property to true but the status of the record is anything but
    hub.Record.READY, the return value of this property may remain false.
    
    @property {Boolean}
  */
  isEditable: function(key, value) {
    if (value !== undefined) this._hub_screc_isEditable = value;
    if (this.get('status') & hub.Record.READY) return this._hub_screc_isEditable;
    else return false ;
  }.property('status').cacheable(),
  
  _hub_screc_isEditable: true, // default
  
  /**
    true when the record's contents have been loaded for the first time.  You 
    can use this to quickly determine if the record is ready to display.
    
    @property {Boolean}
  */
  isLoaded: function() {
    var K = hub.Record, 
        status = this.get('status');
    return !((status===K.EMPTY) || (status===K.BUSY_LOADING) || (status===K.ERROR));
  }.property('status').cacheable(),
  
  /**
    If set, this should be an array of active relationship objects that need
    to be notified whenever the underlying record properties change.  
    Currently this is only used by toMany relationships, but you could 
    possibly patch into this yourself also if you are building your own 
    relationships.
    
    Note this must be a regular Array - NOT any object implmenting hub.Array.
    
    @property {Array}
  */
  relationships: null,

  /**
    This will return the raw attributes that you can edit directly.  If you 
    make changes to this hash, be sure to call beginEditing() before you get
    the attributes and endEditing() afterwards.
  
    @property {Hash}
  **/
  attributes: function() {
    var store = this.get('store') ;
    return (store) ? store.readEditableDataHash(this.storeKey) : {} ;
  }.property(),
    
  // ...............................
  // CRUD OPERATIONS
  //

  /**
    Refresh the record from the persistent store.  If the record was loaded 
    from a persistent store, then the store will be asked to reload the 
    record data from the server.  If the record is new and exists only in 
    memory then this call will have no effect.
    
    @returns {hub.Record} receiver
  */
  refresh: function() { 
    this.get('store').refreshRecord(null, null, this.get('storeKey'));
    return this ;
  },
  
  /**
    Deletes the record along with any dependent records.  This will mark the 
    records destroyed in the store as well as changing the isDestroyed 
    property on the record to true.  If this is a new record, this will avoid 
    creating the record in the first place.
    
    @returns {hub.Record} receiver
  */
  destroy: function() { 
    this.get('store').destroyRecord(null, null, this.get('storeKey'));
    this.propertyDidChange('status');
    return this ;
  },

  /**
    You can invoke this method anytime you need to make the record as dirty.
    This will cause the record to be commited when you commitChanges()
    on the underlying store.
    
    If you use the writeAttribute() primitive, this method will be called for 
    you.
    
    If you pass the key that changed it will ensure that observers are fired
    only once for the changed property instead of allPropertiesDidChange()
    
    @param {String} key that changed (optional)
    @returns {hub.Record} receiver
  */
  recordDidChange: function(key) {
    this.get('store').recordDidChange(null, null, this.get('storeKey'), key);
    this.notifyPropertyChange('status');
    return this ;
  },
  
  // ...............................
  // ATTRIBUTES
  //

  /** @private
    Current edit level.  Used to defer editing changes. 
  */
  _hub_editLevel: 0 ,
  
  /**
    Defers notification of record changes until you call a matching 
    endEditing() method.  This method is called automatically whenever you
    set an attribute, but you can call it yourself to group multiple changes.
    
    Calls to beginEditing() and endEditing() can be nested.
    
    @returns {hub.Record} receiver
  */
  beginEditing: function() {
    this._hub_editLevel++;
    return this ;
  },

  /**
    Notifies the store of record changes if this matches a top level call to
    beginEditing().  This method is called automatically whenever you set an
    attribute, but you can call it yourself to group multiple changes.
    
    Calls to beginEditing() and endEditing() can be nested.
    
    @param {String} key that changed (optional)
    @returns {hub.Record} receiver
  */
  endEditing: function(key) {
    if(--this._hub_editLevel <= 0) {
      this._hub_editLevel = 0; 
      this.recordDidChange(key);
    }
    return this ;
  },
  
  /**
    Reads the raw attribute from the underlying data hash.  This method does
    not transform the underlying attribute at all.
  
    @param {String} key the attribute you want to read
    @returns {Object} the value of the key, or null if it doesn't exist
  */
  readAttribute: function(key) {
    var store = this.get('store'), storeKey = this.storeKey;
    var attrs = store.readDataHash(storeKey);
    return attrs ? attrs[key] : undefined ; 
  },

  /**
    Updates the passed attribute with the new value.  This method does not 
    transform the value at all.  If instead you want to modify an array or 
    hash already defined on the underlying json, you should instead get 
    an editable version of the attribute using editableAttribute()
  
    @param {String} key the attribute you want to read
    @param {Object} value the value you want to write
    @param {Boolean} ignoreDidChange only set if you do NOT want to flag 
      record as dirty
    @returns {hub.Record} receiver
  */
  writeAttribute: function(key, value, ignoreDidChange) {
    var store    = this.get('store'), 
        storeKey = this.storeKey,
        status   = store.peekStatus(storeKey),
        recordAttr = this[key],
        recordType = hub.Store.recordTypeFor(storeKey),
        attrs;
    
    attrs = store.readEditableDataHash(storeKey);
    if (!attrs) throw hub.Record.BAD_STATE_ERROR;

    // if value is the same, do not flag record as dirty
    if (value !== attrs[key]) {
      if(!ignoreDidChange) this.beginEditing();
      attrs[key] = value;
      if(!ignoreDidChange) this.endEditing(key);
    }
    
    // if value is primaryKey of record, write it to idsByStoreKey
    if (key===this.get('primaryKey')) {
      hub.Store.idsByStoreKey[storeKey] = attrs[key] ;
      this.propertyDidChange('id'); // Reset computed value
    }
    
    // if any aggregates, propagate the state
    if(!recordType.aggregates || recordType.aggregates.length>0) {
      this.propagateToAggregates();
    }
    
    return this ;  
  },
  
  /**
    This will also ensure that any aggregate records are also marked dirty
    if this record changes.
    
    Should not have to be called manually.
  */
  propagateToAggregates: function() {
    var storeKey = this.get('storeKey'),
        recordType = hub.Store.recordTypeFor(storeKey), 
        idx, len, key, val, recs;
    
    var aggregates = recordType.aggregates;
    
    // if recordType aggregates are not set up yet, make sure to 
    // create the cache first
    if(!aggregates) {
      var dataHash = this.get('store').readDataHash(storeKey),
          aggregates = [];
      for(k in dataHash) {
        if(this[k] && this[k].get && this[k].get('aggregate')===true) {
          aggregates.push(k);
        }
      }
      recordType.aggregates = aggregates;
    }
    
    // now loop through all aggregate properties and mark their related
    // record objects as dirty
    for(idx=0,len=aggregates.length;idx<len;idx++) {
      key = aggregates[idx];
      val = this.get(key);
      
      recs = hub.kindOf(val, hub.ManyArray) ? val : [val];
      recs.forEach(function(rec) {
        // write the dirty status
        if(rec) { 
          rec.get('store').writeStatus(rec.get('storeKey'), this.get('status'));
          rec.storeDidChangeProperties(true);
        }
      }, this);
    }
    
  },
  
  /**
    Called by the store whenever the underlying data hash has changed.  This
    will notify any observers interested in data hash properties that they
    have changed.
    
    @param {Boolean} statusOnly changed
    @param {String} key that changed (optional)
    @returns {hub.Record} receiver
  */
  storeDidChangeProperties: function(statusOnly, keys) {
    if (statusOnly) this.notifyPropertyChange('status');
    else {      
      if (keys) {
        this.beginPropertyChanges();
        keys.forEach(function(k) { this.notifyPropertyChange(k); }, this);
        this.notifyPropertyChange('status'); 
        this.endPropertyChanges();
        
      } else this.allPropertiesDidChange(); 
    
      // also notify manyArrays
      var manyArrays = this.relationships,
          loc        = manyArrays ? manyArrays.length : 0 ;
      while(--loc>=0) manyArrays[loc].recordPropertyDidChange(keys);
    }
  },
  
  /**
    Normalizing a record will ensure that the underlying hash conforms
    to the record attributes such as their types (transforms) and default 
    values. 
    
    This method will write the conforming hash to the store and return
    the materialized record.
    
    By normalizing the record, you can use .attributes() and be
    assured that it will conform to the defined model. For example, this
    can be useful in the case where you need to send a JSON representation
    to some server after you have used .createRecord(), since this method
    will enforce the 'rules' in the model such as their types and default
    values. You can also include null values in the hash with the 
    includeNull argument.
    
    @param {Boolean} includeNull will write empty (null) attributes
    @returns {hub.Record} the normalized record
  */
  
  normalize: function(includeNull) {
    
    var primaryKey = this.primaryKey, 
        dataHash   = {}, 
        recordId   = this.get('id'), 
        store      = this.get('store'), 
        storeKey   = this.get('storeKey'), 
        recHash, attrValue, isRecord, defaultVal;
    
    dataHash[primaryKey] = recordId;
    
    for(var key in this) {
      // make sure property is a record attribute.
      if(this[key] && this[key]['typeClass']) {
        
        isRecord = hub.typeOf(this[key].typeClass())==='class';

        if (!isRecord) {
          attrValue = this.get(key);
          if(attrValue!==undefined || (attrValue===null && includeNull)) {
            dataHash[key] = attrValue;
          }
        }
        else if(isRecord) {
          recHash = store.readDataHash(storeKey);

          if(recHash[key]!==undefined) {
            // write value already there
            dataHash[key] = recHash[key];

          // or write default
          } else {
            defaultVal = this[key].get('defaultValue');

            // computed default value
            if (hub.typeOf(defaultVal)===hub.T_FUNCTION) {
              dataHash[key] = defaultVal();
            
            // plain value
            } else {
              dataHash[key] = defaultVal;
            }
          }
        }
      }
    }
    
    store.writeDataHash(storeKey, dataHash);
    return store.materializeRecord(storeKey);
  },
  
  /**
    If you try to get/set a property not defined by the record, then this 
    method will be called. It will try to get the value from the set of 
    attributes.
    
    This will also check is ignoreUnknownProperties is set on the recordType
    so that they will not be written to dataHash unless explicitly defined
    in the model schema.
  
    @param {String} key the attribute being get/set
    @param {Object} value the value to set the key to, if present
    @returns {Object} the value
  */
  unknownProperty: function(key, value) {
    
    if (value !== undefined) {
      
      // first check if we should ignore unknown properties for this 
      // recordType
      var storeKey = this.get('storeKey'),
        recordType = hub.Store.recordTypeFor(storeKey);
      
      if(recordType.ignoreUnknownProperties===true) {
        this[key] = value;
        return value;
      }
      
      // if we're modifying the PKEY, then hub.Store needs to relocate where 
      // this record is cached. store the old key, update the value, then let 
      // the store do the housekeeping...
      var primaryKey = this.get('primaryKey');
      this.writeAttribute(key,value);

      // update ID if needed
      if (key === primaryKey) {
        hub.Store.replaceIdFor(storeKey, value);
      }
      
    }
    return this.readAttribute(key);
  },
  
  /**
    Lets you commit this specific record to the store which will trigger
    the appropriate methods in the data source for you.
    
    @param {Hash} params optional additonal params that will passed down
      to the data source
    @returns {hub.Record} receiver
  */
  commitRecord: function(params) {
    var store = this.get('store');
    store.commitRecord(undefined, undefined, this.get('storeKey'), params);
    return this ;
  },
  
  // ..........................................................
  // EMULATE hub.Error API
  // 
  
  /**
    Returns true whenever the status is hub.Record.ERROR.  This will allow you 
    to put the UI into an error state.
    
    @property {Boolean}
  */
  isError: function() {
    return this.get('status') & hub.Record.ERROR;
  }.property('status').cacheable(),

  /**
    Returns the receiver if the record is in an error state.  Returns null
    otherwise.
    
    @property {hub.Record}
  */
  errorValue: function() {
    return this.get('isError') ? hub.val(this.get('errorObject')) : null ;
  }.property('isError').cacheable(),
  
  /**
    Returns the current error object only if the record is in an error state.
    If no explicit error object has been set, returns hub.Record.GENERIC_ERROR.
    
    @property {hub.Error}
  */
  errorObject: function() {
    if (this.get('isError')) {
      var store = this.get('store');
      return store.readError(this.get('storeKey')) || hub.Record.GENERIC_ERROR;
    } else return null ;
  }.property('isError').cacheable(),
  
  // ...............................
  // PRIVATE
  //
  
  /** @private
    Creates string representation of record, with status.
    
    @returns {String}
  */
  
  toString: function() {
    var attrs = this.get('attributes');
    return hub.fmt("%@(%@) %@", this.constructor.toString(), hub.inspect(attrs), this.statusString());
  },
  
  /** @private
    Creates string representation of record, with status.
    
    @returns {String}
  */
  
  statusString: function() {
    var ret = [], status = this.get('status');
    
    for(var prop in hub.Record) {
      if(prop.match(/[A-Z_]$/) && hub.Record[prop]===status) {
        ret.push(prop);
      }
    }
    
    return ret.join(" ");
  }
      
}) ;

// Class Methods
hub.Record.mixin( /** @scope hub.Record */ {

  /**
    Whether to ignore unknown properties when they are being set on the record
    object. This is useful if you want to strictly enforce the model schema
    and not allow dynamically expanding it by setting new unknown properties
    
    @property {Boolean}
  */
  ignoreUnknownProperties: false,

  // ..........................................................
  // CONSTANTS
  // 

  /** 
    Generic state for records with no local changes.
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  CLEAN:            0x0001, // 1

  /** 
    Generic state for records with local changes.
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  DIRTY:            0x0002, // 2
  
  /** 
    State for records that are still loaded.  
    
    A record instance should never be in this state.  You will only run into 
    it when working with the low-level data hash API on hub.Store. Use a 
    logical AND (single &) to test record status
  
    @property {Number}
  */
  EMPTY:            0x0100, // 256

  /** 
    State for records in an error state.
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  ERROR:            0x1000, // 4096
  
  /** 
    Generic state for records that are loaded and ready for use
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  READY:            0x0200, // 512

  /** 
    State for records that are loaded and ready for use with no local changes
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  READY_CLEAN:      0x0201, // 513


  /** 
    State for records that are loaded and ready for use with local changes
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  READY_DIRTY:      0x0202, // 514


  /** 
    State for records that are new - not yet committed to server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  READY_NEW:        0x0203, // 515
  

  /** 
    Generic state for records that have been destroyed
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  DESTROYED:        0x0400, // 1024


  /** 
    State for records that have been destroyed and committed to server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  DESTROYED_CLEAN:  0x0401, // 1025


  /** 
    State for records that have been destroyed but not yet committed to server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  DESTROYED_DIRTY:  0x0402, // 1026
  

  /** 
    Generic state for records that have been submitted to data source
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY:             0x0800, // 2048


  /** 
    State for records that are still loading data from the server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_LOADING:     0x0804, // 2052


  /** 
    State for new records that were created and submitted to the server; 
    waiting on response from server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_CREATING:    0x0808, // 2056


  /** 
    State for records that have been modified and submitted to server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_COMMITTING:  0x0810, // 2064


  /** 
    State for records that have requested a refresh from the server.
    
    Use a logical AND (single &) to test record status.
  
    @property {Number}
  */
  BUSY_REFRESH:     0x0820, // 2080


  /** 
    State for records that have requested a refresh from the server.
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_REFRESH_CLEAN:  0x0821, // 2081

  /** 
    State for records that have requested a refresh from the server.
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_REFRESH_DIRTY:  0x0822, // 2082

  /** 
    State for records that have been destroyed and submitted to server
    
    Use a logical AND (single &) to test record status
  
    @property {Number}
  */
  BUSY_DESTROYING:  0x0840, // 2112


  // ..........................................................
  // ERRORS
  // 
  
  /**
    Error for when you try to modify a record while it is in a bad 
    state.
    
    @property {hub.Error}
  */
  BAD_STATE_ERROR:     hub.E("Internal Inconsistency"),

  /**
    Error for when you try to create a new record that already exists.
    
    @property {hub.Error}
  */
  RECORD_EXISTS_ERROR: hub.E("Record Exists"),

  /**
    Error for when you attempt to locate a record that is not found
    
    @property {hub.Error}
  */
  NOT_FOUND_ERROR:     hub.E("Not found "),

  /**
    Error for when you try to modify a record that is currently busy
    
    @property {hub.Error}
  */
  BUSY_ERROR:          hub.E("Busy"),

  /**
    Generic unknown record error
    
    @property {hub.Error}
  */
  GENERIC_ERROR:       hub.E("Generic Error"),
  
  // ..........................................................
  // CLASS METHODS
  // 
  
  /**
    Helper method returns a new hub.RecordAttribute instance to map a simple
    value or to-one relationship.  At the very least, you should pass the 
    type class you expect the attribute to have.  You may pass any additional
    options as well.
    
    Use this helper when you define hub.Record subclasses. 
    
    h4. Example
    
    {{{
      MyApp.Contact = hub.Record.extend({
        firstName: hub.Record.attr(String, { isRequired: true })
      });
    }}}
    
    @param {Class} type the attribute type
    @param {Hash} opts the options for the attribute
    @returns {hub.RecordAttribute} created instance
  */
  attr: function(type, opts) { 
    return hub.RecordAttribute.attr(type, opts); 
  },
  
  /**
    Returns an hub.RecordAttribute that describes a fetched attribute.  When 
    you reference this attribute, it will return an hub.RecordArray that uses
    the type as the fetch key and passes the attribute value as a param.
    
    Use this helper when you define hub.Record subclasses. 
    
    h4. Example
    
    {{{
      MyApp.Group = hub.Record.extend({
        contacts: hub.Record.fetch('MyApp.Contact')
      });
    }}}
    
    @param {hub.Record|String} recordType The type of records to load
    @param {Hash} opts the options for the attribute
    @returns {hub.RecordAttribute} created instance
  */
  fetch: function(recordType, opts) {
    return hub.FetchedAttribute.attr(recordType, opts) ;
  },
  
  /**
    Returns an hub.ManyAttribute that describes a record array backed by an 
    array of guids stored in the underlying JSON.  You can edit the contents
    of this relationship.
    
    If you set the inverse and isMaster: false key, then editing this array will
    modify the underlying data, but the inverse key on the matching record
    will also be edited and that record will be marked as needing a change.
    
    @param {hub.Record|String} recordType The type of record to create
    @param {Hash} opts the options for the attribute
    @returns {hub.ManyAttribute} created instance
  */
  toMany: function(recordType, opts) {
    return hub.ManyAttribute.attr(recordType, opts);
  },
  
  /**
    Returns a hub.SingleAttribute that converts the underlying ID to a single
    record.  If you modify this property, it will rewrite the underyling ID. 
    It will also modify the inverse of the relationship, if you set it.
    
    @param {hub.Record|String} recordType the type of the record to create
    @param {Hash} opts additional options
    @returns {hub.SingleAttribute} created instance
  */
  toOne: function(recordType, opts) {
    return hub.SingleAttribute.attr(recordType, opts);
  },
    
  /**
    Returns all storeKeys mapped by Id for this record type.  This method is
    used mostly by the hub.Store and the Record to coordinate.  You will rarely
    need to call this method yourself.
    
    @returns {Hash}
  */
  storeKeysById: function() {
    var key = hub.keyFor('storeKey', hub.guidFor(this)),
        ret = this[key];
    if (!ret) ret = this._hub_storeKeysById = this[key] = {};
    return ret;
  },
  
  /**
    Given a primaryKey value for the record, returns the associated
    storeKey.  If the primaryKey has not been assigned a storeKey yet, it 
    will be added.
    
    For the inverse of this method see hub.Store.idFor() and 
    hub.Store.recordTypeFor().
    
    @param {String} id a record id
    @returns {Number} a storeKey.
  */
  storeKeyFor: function(id) {
    var storeKeysById = this._hub_storeKeysById ;
    if (!storeKeysById) storeKeysById = this.storeKeysById() ;
    var ret = storeKeysById[id] ;
    
    if (!ret) {
      ret = hub.Store.generateStoreKey();
      hub.Store.idsByStoreKey[ret] = id ;
      hub.Store.recordTypesByStoreKey[ret] = this ;
      storeKeysById[id] = ret ;
    }
    
    return ret ;
  },
  
  /**
    Given a primaryKey value for the record, returns the associated
    storeKey.  As opposed to storeKeyFor() however, this method
    will NOT generate a new storeKey but returned undefined.
    
    @param {String} id a record id
    @returns {Number} a storeKey.
  */
  storeKeyExists: function(id) {
    var storeKeysById = this._hub_storeKeysById ;
    if (!storeKeysById) storeKeysById = this.storeKeysById() ;
    return storeKeysById[id] ;
  },
  
  /** 
    Returns a record with the named ID in store.
    
    @param {hub.Store} store the store
    @param {String} id the record id or a query
    @returns {hub.Record} record instance
  */
  find: function(store, id) {
    return store.find(this, id);
  },
  
  /** @private - enhance extend to notify hub.Query as well. */
  extend: function() {
    var ret = hub.Object.extend.apply(this, arguments);
    hub.Query._hub_scq_didDefineRecordType(ret);
    return ret ;
  }
  
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  @class
  @extends hub.DataSource
*/
hub.FixturesDataSource = hub.DataSource.extend(
  /** @scope hub.FixturesDataSource.prototype */ {

  /**
    If true then the data source will asyncronously respond to data requests
    from the server.  If you plan to replace the fixture data source with a 
    data source that talks to a real remote server (using Ajax for example),
    you should leave this property set to true so that Fixtures source will
    more accurately simulate your remote data source.

    If you plan to replace this data source with something that works with 
    local storage, for example, then you should set this property to false to 
    accurately simulate the behavior of your actual data source.
    
    @property {Boolean}
  */
  simulateRemoteResponse: false,
  
  /**
    If you set simulateRemoteResponse to true, then the fixtures soure will
    assume a response latency from your server equal to the msec specified
    here.  You should tune this to simulate latency based on the expected 
    performance of your server network.  Here are some good guidelines:
    
    - 500: Simulates a basic server written in PHP, Ruby, or Python (not twisted) without a CDN in front for caching.
    - 250: (Default) simulates the average latency needed to go back to your origin server from anywhere in the world.  assumes your servers itself will respond to requests < 50 msec
    - 100: simulates the latency to a "nearby" server (i.e. same part of the world).  Suitable for simulating locally hosted servers or servers with multiple data centers around the world.
    - 50: simulates the latency to an edge cache node when using a CDN.  Life is really good if you can afford this kind of setup.
    
    @property {Number}
  */
  latency: 50,
  
  // ..........................................................
  // CANCELLING
  // 
  
  /** @private */
  cancel: function(store, storeKeys) {
    return false;
  },
  
  
  // ..........................................................
  // FETCHING
  // 
  
  /** @private */
  fetch: function(store, query) {
    
    // can only handle local queries out of the box
    if (query.get('location') !== hub.Query.LOCAL) {
      throw hub.E('hub.Fixture data source can only fetch local queries');
    }

    if (!query.get('recordType') && !query.get('recordTypes')) {
      throw hub.E('hub.Fixture data source can only fetch queries with one or more record types');
    }
    
    if (this.get('simulateRemoteResponse')) {
      this.invokeLater(this._hub_fetch, this.get('latency'), store, query);
      
    } else this._hub_fetch(store, query);
  },
  
  /** @private
    Actually performs the fetch.  
  */
  _hub_fetch: function(store, query) {
    
    // NOTE: Assumes recordType or recordTypes is defined.  checked in fetch()
    var recordType = query.get('recordType'),
        recordTypes = query.get('recordTypes') || [recordType];
        
    // load fixtures for each recordType
    recordTypes.forEach(function(recordType) {
      if (hub.typeOf(recordType) === hub.T_STRING) {
        recordType = hub.objectForPropertyPath(recordType);
      }
      
      if (recordType) this.loadFixturesFor(store, recordType);
    }, this);
    
    // notify that query has now loaded - puts it into a READY state
    store.dataSourceDidFetchQuery(query);
  },
  
  // ..........................................................
  // RETRIEVING
  // 
  
  /** @private */
  retrieveRecords: function(store, storeKeys) {
    // first let's see if the fixture data source can handle any of the
    // storeKeys
    var latency = this.get('latency'),
        ret     = this.hasFixturesFor(storeKeys) ;
    if (!ret) return ret ;
    
    if (this.get('simulateRemoteResponse')) {
      this.invokeLater(this._hub_retrieveRecords, latency, store, storeKeys);
    } else this._hub_retrieveRecords(store, storeKeys);
    
    return ret ;
  },
  
  _hub_retrieveRecords: function(store, storeKeys) {
    
    storeKeys.forEach(function(storeKey) {
      var ret        = [], 
          recordType = hub.Store.recordTypeFor(storeKey),
          id         = store.idFor(storeKey),
          hash       = this.fixtureForStoreKey(store, storeKey);
      ret.push(storeKey);
      store.dataSourceDidComplete(storeKey, hash, id);
    }, this);
  },
  
  // ..........................................................
  // UPDATE
  // 
  
  /** @private */
  updateRecords: function(store, storeKeys, params) {
    // first let's see if the fixture data source can handle any of the
    // storeKeys
    var latency = this.get('latency'),
        ret     = this.hasFixturesFor(storeKeys) ;
    if (!ret) return ret ;
    
    if (this.get('simulateRemoteResponse')) {
      this.invokeLater(this._hub_updateRecords, latency, store, storeKeys);
    } else this._hub_updateRecords(store, storeKeys);
    
    return ret ;
  },
  
  _hub_updateRecords: function(store, storeKeys) {
    storeKeys.forEach(function(storeKey) {
      var hash = store.readDataHash(storeKey);
      this.setFixtureForStoreKey(store, storeKey, hash);
      store.dataSourceDidComplete(storeKey);  
    }, this);
  },


  // ..........................................................
  // CREATE RECORDS
  // 
  
  /** @private */
  createRecords: function(store, storeKeys, params) {
    // first let's see if the fixture data source can handle any of the
    // storeKeys
    var latency = this.get('latency');
    
    if (this.get('simulateRemoteResponse')) {
      this.invokeLater(this._hub_createRecords, latency, store, storeKeys);
    } else this._hub_createRecords(store, storeKeys);
    
    return true ;
  },

  _hub_createRecords: function(store, storeKeys) {
    storeKeys.forEach(function(storeKey) {
      var id         = store.idFor(storeKey),
          recordType = store.recordTypeFor(storeKey),
          dataHash   = store.readDataHash(storeKey), 
          fixtures   = this.fixturesFor(recordType);

      if (!id) id = this.generateIdFor(recordType, dataHash, store, storeKey);
      this._hub_invalidateCachesFor(recordType, storeKey, id);
      fixtures[id] = dataHash;

      store.dataSourceDidComplete(storeKey, null, id);
    }, this);
  },

  // ..........................................................
  // DESTROY RECORDS
  // 
  
  /** @private */
  destroyRecords: function(store, storeKeys, params) {
    // first let's see if the fixture data source can handle any of the
    // storeKeys
    var latency = this.get('latency'),
        ret     = this.hasFixturesFor(storeKeys) ;
    if (!ret) return ret ;
    
    if (this.get('simulateRemoteResponse')) {
      this.invokeLater(this._hub_destroyRecords, latency, store, storeKeys);
    } else this._hub_destroyRecords(store, storeKeys);
    
    return ret ;
  },
  

  _hub_destroyRecords: function(store, storeKeys) {
    storeKeys.forEach(function(storeKey) {
      var id         = store.idFor(storeKey),
          recordType = store.recordTypeFor(storeKey),
          fixtures   = this.fixturesFor(recordType);

      this._hub_invalidateCachesFor(recordType, storeKey, id);
      if (id) delete fixtures[id];
      store.dataSourceDidDestroy(storeKey);  
    }, this);
  },
  
  // ..........................................................
  // INTERNAL METHODS/PRIMITIVES
  // 

  /**
    Load fixtures for a given fetchKey into the store
    and push it to the ret array.
    
    @param {hub.Store} store the store to load into
    @param {hub.Record} recordType the record type to load
    @param {hub.Array} ret is passed, array to add loaded storeKeys to.
    @returns {hub.Fixture} receiver
  */
  loadFixturesFor: function(store, recordType, ret) {
    var hashes   = [],
        dataHashes, i, storeKey ;
    
    dataHashes = this.fixturesFor(recordType);
    
    for(i in dataHashes){
      storeKey = recordType.storeKeyFor(i);
      if (store.peekStatus(storeKey) === hub.Record.EMPTY) {
        hashes.push(dataHashes[i]);
      }
      if (ret) ret.push(storeKey);
    }

    // only load records that were not already loaded to avoid infinite loops
    if (hashes && hashes.length>0) store.loadRecords(recordType, hashes);
    
    return this ;
  },
  

  /**
    Generates an id for the passed record type.  You can override this if 
    needed.  The default generates a storekey and formats it as a string.
    
    @param {Class} recordType Subclass of hub.Record
    @param {Hash} dataHash the data hash for the record
    @param {hub.Store} store the store 
    @param {Number} storeKey store key for the item
    @returns {String}
  */
  generateIdFor: function(recordType, dataHash, store, storeKey) {
    return ["@id", hub.Store.generateStoreKey()].join('') ;
  },
  
  /**
    Based on the storeKey it returns the specified fixtures
    
    @param {hub.Store} store the store 
    @param {Number} storeKey the storeKey
    @returns {Hash} data hash or null
  */
  fixtureForStoreKey: function(store, storeKey) {
    var id         = store.idFor(storeKey),
        recordType = store.recordTypeFor(storeKey),
        fixtures   = this.fixturesFor(recordType);
    return fixtures ? fixtures[id] : null;
  },
  
  /**
    Update the data hash fixture for the named store key.  
    
    @param {hub.Store} store the store 
    @param {Number} storeKey the storeKey
    @param {Hash} dataHash 
    @returns {hub.FixturesDataSource} receiver
  */
  setFixtureForStoreKey: function(store, storeKey, dataHash) {
    var id         = store.idFor(storeKey),
        recordType = store.recordTypeFor(storeKey),
        fixtures   = this.fixturesFor(recordType);
    this._hub_invalidateCachesFor(recordType, storeKey, id);
    fixtures[id] = dataHash;
    return this ;
  },
  
  /** 
    Get the fixtures for the passed record type and prepare them if needed.
    Return cached value when complete.
    
    @param {hub.Record} recordType
    @returns {Hash} data hashes
  */
  fixturesFor: function(recordType) {
    // get basic fixtures hash.
    if (!this._hub_fixtures) this._hub_fixtures = {};
    var fixtures = this._hub_fixtures[hub.guidFor(recordType)];
    if (fixtures) return fixtures ; 
    
    // need to load fixtures.
    var dataHashes = recordType ? recordType.FIXTURES : null,
        len        = dataHashes ? dataHashes.length : 0,
        primaryKey = recordType ? recordType.prototype.primaryKey : 'guid',
        idx, dataHash, id ;

    this._hub_fixtures[hub.guidFor(recordType)] = fixtures = {} ; 
    for(idx=0;idx<len;idx++) {      
      dataHash = dataHashes[idx];
      id = dataHash[primaryKey];
      if (!id) id = this.generateIdFor(recordType, dataHash); 
      fixtures[id] = dataHash;
    }  
    return fixtures;
  },
  
  /**
    Returns true if fixtures for a given recordType have already been loaded
    
    @param {hub.Record} recordType
    @returns {Boolean} storeKeys
  */
  fixturesLoadedFor: function(recordType) {
    if (!this._hub_fixtures) return false;
    var ret = [], fixtures = this._hub_fixtures[hub.guidFor(recordType)];
    return fixtures ? true: false;
  },
  
  /**
    Returns true or hub.MIXED_STATE if one or more of the storeKeys can be 
    handled by the fixture data source.
    
    @param {Array} storeKeys the store keys
    @returns {Boolean} true if all handled, MIXED_STATE if some handled
  */
  hasFixturesFor: function(storeKeys) {
    var ret = false ;
    storeKeys.forEach(function(storeKey) {
      if (ret !== hub.MIXED_STATE) {
        var recordType = hub.Store.recordTypeFor(storeKey),
            fixtures   = recordType ? recordType.FIXTURES : null ;
        if (fixtures && fixtures.length && fixtures.length>0) {
          if (ret === false) ret = true ;
        } else if (ret === true) ret = hub.MIXED_STATE ;
      }
    }, this);
    
    return ret ;
  },
  
  /** @private
    Invalidates any internal caches based on the recordType and optional 
    other parameters.  Currently this only invalidates the storeKeyCache used
    for fetch, but it could invalidate others later as well.
    
    @param {hub.Record} recordType the type of record modified
    @param {Number} storeKey optional store key
    @param {String} id optional record id
    @returns {hub.FixturesDataSource} receiver
  */
  _hub_invalidateCachesFor: function(recordType, storeKey, id) {
    var cache = this._hub_storeKeyCache;
    if (cache) delete cache[hub.guidFor(recordType)];
    return this ;
  }
  
});

/**
  Default fixtures instance for use in applications.
  
  @property {hub.FixturesDataSource}
*/
hub.Record.fixtures = hub.FixturesDataSource.create() ;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  hub.RecordAttribute describes a single attribute on a record.  It is used to
  generate computed properties on records that can automatically convert data
  types and verify data.
  
  When defining an attribute on an hub.Record, you can configure it this way: 
  
  {{{
    title: hub.Record.attr(String, { 
      defaultValue: 'Untitled',
      isRequired: true|false
    })
  }}}
  
  In addition to having predefined transform types, there is also a way to 
  set a computed relationship on an attribute. A typical example of this would
  be if you have record with a parentGuid attribute, but are not able to 
  determine which record type to map to before looking at the guid (or any
  other attributes). To set up such a computed property, you can attach a 
  function in the attribute definition of the hub.Record subclass:
  
  {{{
    relatedToComputed: hub.Record.toOne(function() {
      return (this.readAttribute('relatedToComputed').indexOf("foo")==0) ? MyApp.Foo : MyApp.Bar;
    })
  }}}
  
  Notice that we are not using .get() to avoid another transform which would 
  trigger an infinite loop.
  
  You usually will not work with RecordAttribute objects directly, though you
  may extend the class in any way that you like to create a custom attribute.
  
  A number of default RecordAttribute types are defined on the hub.Record.
  
  @class
  @extends hub.Object
*/
hub.RecordAttribute = hub.Object.extend(
  /** @scope hub.RecordAttribute.prototype */ {

  /**
    The default value.  If attribute is null or undefined, this default value
    will be substituted instead.  Note that defaultValues are not converted
    so the value should be in the output type expected by the attribute.
    
    @property {Object}
  */
  defaultValue: null,
  
  /**
    The attribute type.  Must be either an object class or a property path
    naming a class.  The built in handler allows all native types to pass 
    through, converts records to ids and dates to UTF strings.
    
    If you use the attr() helper method to create a RecordAttribute instance,
    it will set this property to the first parameter you pass.
    
    @property {Object|String}
  */
  type: String,
  
  /**
    The underlying attribute key name this attribute should manage.  If this
    property is left empty, then the key will be whatever property name this
    attribute assigned to on the record.  If you need to provide some kind
    of alternate mapping, this provides you a way to override it.
    
    @property {String}
  */
  key: null,
  
  /**
    If true, then the attribute is required and will fail validation unless
    the property is set to a non-null or undefined value.
    
    @property {Boolean}
  */
  isRequired: false,
  
  /**
    If false then attempts to edit the attribute will be ignored.
    
    @property {Boolean}
  */
  isEditable: true,  
  
  /**
    If set when using the Date format, expect the ISO8601 date format.  
    This is the default.
    
    @property {Boolean}
  */
  useIsoDate: true,
  
  /**
    Can only be used for toOne or toMany relationship attributes. If true,
    this flag will ensure that any related objects will also be marked
    dirty when this record dirtied. 
    
    Useful when you might have multiple related objects that you want to 
    consider in an 'aggregated' state. For instance, by changing a child
    object (image) you might also want to automatically mark the parent 
    (album) dirty as well.
    
    @property {Boolean}
  */
  aggregate: false,
  
  // ..........................................................
  // HELPER PROPERTIES
  // 
  
  /**
    Returns the type, resolved to a class.  If the type property is a regular
    class, returns the type unchanged.  Otherwise attempts to lookup the 
    type as a property path.
    
    @property {Object}
  */
  typeClass: function() {
    var ret = this.get('type');
    if (hub.typeOf(ret) === hub.T_STRING) ret = hub.objectForPropertyPath(ret);
    return ret ;
  }.property('type').cacheable(),
  
  /**
    Finds the transform handler. 
    
    @property {Function}
  */
  transform: function() {
    var klass      = this.get('typeClass') || String,
        transforms = hub.RecordAttribute.transforms,
        ret ;
        
    // walk up class hierarchy looking for a transform handler
    while(klass && !(ret = transforms[hub.guidFor(klass)])) {
      // check if super has create property to detect hub.Object's
      if(klass.superclass.hasOwnProperty('create')) klass = klass.superclass ;
      // otherwise return the function transform handler
      else klass = hub.T_FUNCTION ;
    }
    
    return ret ;
  }.property('typeClass').cacheable(),
  
  // ..........................................................
  // LOW-LEVEL METHODS
  // 
  
  /** 
    Converts the passed value into the core attribute value.  This will apply 
    any format transforms.  You can install standard transforms by adding to
    the hub.RecordAttribute.transforms hash.  See 
    hub.RecordAttribute.registerTransform() for more.
    
    @param {hub.Record} record the record instance
    @param {String} key the key used to access this attribute on the record
    @param {Object} value the property value
    @returns {Object} attribute value
  */
  toType: function(record, key, value) {
    var transform = this.get('transform'),
        type      = this.get('typeClass');
    
    if (transform && transform.to) {
      value = transform.to(value, this, type, record, key) ;
    }
    return value ;
  },

  /** 
    Converts the passed value from the core attribute value.  This will apply 
    any format transforms.  You can install standard transforms by adding to
    the hub.RecordAttribute.transforms hash.  See 
    hub.RecordAttribute.registerTransform() for more.

    @param {hub.Record} record the record instance
    @param {String} key the key used to access this attribute on the record
    @param {Object} value the property value
    @returns {Object} attribute value
  */
  fromType: function(record, key, value) {
    var transform = this.get('transform'),
        type      = this.get('typeClass');
    
    if (transform && transform.from) {
      value = transform.from(value, this, type, record, key);
    }
    return value;
  },

  /**
    The core handler.  Called from the property.
    
    @param {hub.Record} record the record instance
    @param {String} key the key used to access this attribute on the record
    @param {Object} value the property value if called as a setter
    @returns {Object} property value
  */
  call: function(record, key, value) {
    var attrKey = this.get('key') || key, nvalue;
    
    if (value !== undefined) {

      // careful: don't overwrite value here.  we want the return value to 
      // cache.
      nvalue = this.fromType(record, key, value) ; // convert to attribute.
      record.writeAttribute(attrKey, nvalue); 
    } else {
      value = record.readAttribute(attrKey);
      if (hub.none(value) && (value = this.get('defaultValue'))) {
        if (typeof value === hub.T_FUNCTION) {
          value = this.defaultValue(record, key, this);
          // write default value so it doesn't have to be executed again
          if(record.attributes()) record.writeAttribute(attrKey, value, true);
        }
      } else value = this.toType(record, key, value);
    }
    
    return value ;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  // 
  
  /** @private - Make this look like a property so that get() will call it. */
  isProperty: true,
  
  /** @private - Make this look cacheable */
  isCacheable: true,
  
  /** @private - needed for KVO property() support */
  dependentKeys: [],
  
  /** @private */
  init: function() {
    arguments.callee.base.apply(this, arguments) ;
    // setup some internal properties needed for KVO - faking 'cacheable'
    this.cacheKey = "__hub_cache__" + hub.guidFor(this) ;
    this.lastSetValueKey = "__hub_lastValue__" + hub.guidFor(this) ;
  }
  
}) ;

// ..........................................................
// CLASS METHODS
// 

/**
  The default method used to create a record attribute instance.  Unlike 
  create(), takes an attributeType as the first parameter which will be set 
  on the attribute itself.  You can pass a string naming a class or a class
  itself.
  
  @param {Object|String} attributeType the assumed attribute type
  @param {Hash} opts optional additional config options
  @returns {hub.RecordAttribute} new instance
*/
hub.RecordAttribute.attr = function(attributeType, opts) {
  if (!opts) opts = {} ;
  if (!opts.type) opts.type = attributeType || String ;
  return this.create(opts);
};

/** @private
  Hash of registered transforms by class guid. 
*/
hub.RecordAttribute.transforms = {};

/**
  Call to register a transform handler for a specific type of object.  The
  object you pass can be of any type as long as it responds to the following
  methods:

  | *to(value, attr, klass, record, key)* | converts the passed value (which will be of the class expected by the attribute) into the underlying attribute value |
  | *from(value, attr, klass, record, key)* | converts the underyling attribute value into a value of the class |
  
  @param {Object} klass the type of object you convert
  @param {Object} transform the transform object
  @returns {hub.RecordAttribute} receiver
*/
hub.RecordAttribute.registerTransform = function(klass, transform) {
  hub.RecordAttribute.transforms[hub.guidFor(klass)] = transform;
};

// ..........................................................
// STANDARD ATTRIBUTE TRANSFORMS
// 

// Object, String, Number just pass through.

/** @private - generic converter for Boolean records */
hub.RecordAttribute.registerTransform(Boolean, {
  /** @private - convert an arbitrary object value to a boolean */
  to: function(obj) {
    return hub.none(obj) ? null : !!obj;
  }
});

/** @private - generic converter for Numbers */
hub.RecordAttribute.registerTransform(Number, {
  /** @private - convert an arbitrary object value to a Number */
  to: function(obj) {
    return hub.none(obj) ? null : Number(obj) ;
  }
});

/** @private - generic converter for Strings */
hub.RecordAttribute.registerTransform(String, {
  /** @private - 
    convert an arbitrary object value to a String 
    allow null through as that will be checked separately
  */
  to: function(obj) {
    if (!(typeof obj === hub.T_STRING) && !hub.none(obj) && obj.toString) {
      obj = obj.toString();
    }
    return obj;
  }
});

/** @private - generic converter for Array */
hub.RecordAttribute.registerTransform(Array, {
  /** @private - check if obj is an array
  */
  to: function(obj) {
    if (!hub.isArray(obj) && !hub.none(obj)) {
      obj = [];
    }
    return obj;
  }
});

/** @private - generic converter for Object */
hub.RecordAttribute.registerTransform(Object, {
  /** @private - check if obj is an object */
  to: function(obj) {
    if (!(typeof obj === 'object') && !hub.none(obj)) {
      obj = {};
    }
    return obj;
  }
});

/** @private - generic converter for hub.Record-type records */
hub.RecordAttribute.registerTransform(hub.Record, {

  /** @private - convert a record id to a record instance */
  to: function(id, attr, recordType, parentRecord) {
    var store = parentRecord.get('store');
    if (hub.none(id) || (id==="")) return null;
    else return store.find(recordType, id);
  },
  
  /** @private - convert a record instance to a record id */
  from: function(record) { return record ? record.get('id') : null; }
});

/** @private - generic converter for transforming computed record attributes */
hub.RecordAttribute.registerTransform(hub.T_FUNCTION, {

  /** @private - convert a record id to a record instance */
  to: function(id, attr, recordType, parentRecord) {
    recordType = recordType.apply(parentRecord);
    var store = parentRecord.get('store');
    return store.find(recordType, id);
  },
  
  /** @private - convert a record instance to a record id */
  from: function(record) { return record.get('id'); }
});

/** @private - generic converter for Date records */
hub.RecordAttribute.registerTransform(Date, {

  /** @private - convert a string to a Date */
  to: function(str, attr) {
    var ret ;
    
    if (attr.get('useIsoDate')) {
      var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
             "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" +
             "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?",
          d      = str.toString().match(new RegExp(regexp)),
          offset = 0,
          date   = new Date(d[1], 0, 1),
          time ;

      if (d[3]) { date.setMonth(d[3] - 1); }
      if (d[5]) { date.setDate(d[5]); }
      if (d[7]) { date.setHours(d[7]); }
      if (d[8]) { date.setMinutes(d[8]); }
      if (d[10]) { date.setSeconds(d[10]); }
      if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
      if (d[14]) {
         offset = (Number(d[16]) * 60) + Number(d[17]);
         offset *= ((d[15] == '-') ? 1 : -1);
      }

      offset -= date.getTimezoneOffset();
      time = (Number(date) + (offset * 60 * 1000));
      
      ret = new Date();
      ret.setTime(Number(time));
    } else ret = new Date(Date.parse(str));
    return ret ;
  },
  
  _hub_dates: {},

  _hub_zeropad: function(num) { 
    return ((num<0) ? '-' : '') + ((num<10) ? '0' : '') + Math.abs(num); 
  },
  
  /** @private - convert a date to a string */
  from: function(date) { 
    var ret = this._hub_dates[date.getTime()];
    if (ret) return ret ; 
    
    // figure timezone
    var zp = this._hub_zeropad,
        tz = 0-date.getTimezoneOffset()/60;
        
    tz = (tz === 0) ? 'Z' : hub.fmt('%@:00', zp(tz));
    
    this._hub_dates[date.getTime()] = ret = hub.fmt("%@-%@-%@T%@:%@:%@%@", 
      zp(date.getFullYear()),
      zp(date.getMonth()+1),
      zp(date.getDate()),
      zp(date.getHours()),
      zp(date.getMinutes()),
      zp(date.getSeconds()),
      tz) ;
    
    return ret ;
  }
});

if (hub.DateTime && !hub.RecordAttribute.transforms[hub.guidFor(hub.DateTime)]) {
  /**
    Registers a transform to allow hub.DateTime to be used as a record attribute,
    ie hub.Record.attr(hub.DateTime);
  
    Because hub.RecordAttribute is in the datastore framework and hub.DateTime in
    the foundation framework, and we don't know which framework is being loaded
    first, this chunck of code is duplicated in both frameworks.
  
    IF YOU EDIT THIS CODE MAKE SURE YOU COPY YOUR CHANGES to record_attribute.js. 
  */

  hub.RecordAttribute.registerTransform(hub.DateTime, {
  
    /** @private
      Convert a String to a DateTime
    */
    to: function(str, attr) {
      if (hub.none(str) || hub.instanceOf(str, hub.DateTime)) return str;
      var format = attr.get('format');
      return hub.DateTime.parse(str, format ? format : hub.DateTime.recordFormat);
    },
  
    /** @private
      Convert a DateTime to a String
    */
    from: function(dt, attr) {
      if (hub.none(dt)) return dt;
      var format = attr.get('format');
      return dt.toFormattedString(format ? format : hub.DateTime.recordFormat);
    }
  });
  
}
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  Describes a single attribute that is fetched dynamically from the server
  when you request it.  Normally getting a property value with this attribute
  applied will cause call the find() method on the record store passing
  the attribute record type as the query key along with the property value,
  owner record, and property key name as parameters. 
  
  The DataSource you hook up to your store must know how to load this kind 
  of relationship for this fetched property to work properly.
  
  The return value is usually an hub.RecordArray that will populate with the
  record data so that you can display it.
  
  @class
  @extends hub.RecordAttribute
*/
hub.FetchedAttribute = hub.RecordAttribute.extend(
  /** @scope hub.FetchedAttribute.prototype */ {

  /**
    Define the param key that will be passed to the findAll method on the
    store.  If null, the param will not be send.  Defaults to 'link'
    
    @property {String}
  */
  paramValueKey: 'link',

  /**
    Define the param key used to send the parent record.  If null the param
    will not be sent.  Defaults to 'owner'.
    
    @property {String}
  */
  paramOwnerKey: 'owner',
  
  /**
    Define the param key used to send the key name used to reference this 
    attribute.  If null, the param will not be sent.  Defaults to "rel"
    
    @property {String}
  */
  paramRelKey: 'rel',
  
  /**
    Optional query key to pass to findAll.  Otherwise type class will be 
    passed.
    
    @property {String}
  */
  queryKey: null,

  /** 
    Fetched attributes are not editable 
    
    @property {Boolean}
  */
  isEditable: false,  
  
  // ..........................................................
  // LOW-LEVEL METHODS
  // 
  
  /**  @private - adapted for fetching. do findAll */
  toType: function(record, key, value) {
    var store = record.get('store');
    if (!store) return null ; // nothing to do
    
    var paramValueKey = this.get('paramValueKey'),
        paramOwnerKey = this.get('paramOwnerKey'),
        paramRelKey   = this.get('paramRelKey'),
        queryKey      = this.get('queryKey') || this.get('typeClass'),
        params        = {};

    // setup params for query
    if (paramValueKey) params[paramValueKey] = value ;
    if (paramOwnerKey) params[paramOwnerKey] = record ;
    if (paramRelKey)   params[paramRelKey]   = this.get('key') || key ;
    
    // make request - should return hub.RecordArray instance
    return store.findAll(queryKey, params);
  },

  /** @private - fetched attributes are read only. */
  fromType: function(record, key, value) {
    return value;
  }
  
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  ManyAttribute is a subclass of RecordAttribute and handles to-many 
  relationships.
  
  When setting ( .set() ) the value of a toMany attribute, make sure
  to pass in an array of hub.Record objects.
  
  There are many ways you can configure a ManyAttribute:
  
  {{{
    contacts: hub.Record.toMany('MyApp.Contact', { 
      inverse: 'group', // set the key used to represent the inverse 
      isMaster: true|false, // indicate whether changing this should dirty
      transform: function(), // transforms value <=> storeKey,
      isEditable: true|false, make editable or not,
      through: 'taggings' // set a relationship this goes through
    });
  }}}
  
  @class
  @extends hub.RecordAttribute
*/
hub.ManyAttribute = hub.RecordAttribute.extend(
  /** @scope hub.ManyAttribute.prototype */ {
  
  /**
    Set the foreign key on content objects that represent the inversion of
    this relationship.  The inverse property should be a toOne() or toMany()
    relationship as well.  Modifying this many array will modify the inverse
    property as well.
    
    @property {String}
  */
  inverse: null,
  
  /**
    If true then modifying this relationships will mark the owner record 
    dirty.    If set to false, then modifying this relationship will not alter
    this record.  You should use this property only if you have an inverse 
    property also set.  Only one of the inverse relationships should be marked
    as master so you can control which record should be committed.
    
    @property {Boolean}
  */
  isMaster: true,
  
  /**
    If set and you have an inverse relationship, will be used to determine the
    order of an object when it is added to an array.  You can pass a function
    or an array of property keys.
    
    @property {Function|Array}
  */
  orderBy: null,
  
  // ..........................................................
  // LOW-LEVEL METHODS
  //
  
  /**  @private - adapted for to many relationship */
  toType: function(record, key, value) {
    var type      = this.get('typeClass'),
        attrKey   = this.get('key') || key,
        arrayKey  = hub.keyFor('__manyArray__', hub.guidFor(this)),
        ret       = record[arrayKey],
        rel;

    // lazily create a ManyArray one time.  after that always return the 
    // same object.
    if (!ret) {
      ret = hub.ManyArray.create({ 
        recordType:    type,
        record:        record,
        propertyName:  attrKey,
        manyAttribute: this
      });

      record[arrayKey] = ret ; // save on record
      rel = record.get('relationships');
      if (!rel) record.set('relationships', rel = []);
      rel.push(ret); // make sure we get notified of changes...

    }

    return ret;
  },
  
  /** @private - adapted for to many relationship */
  fromType: function(record, key, value) {
    var ret = [];
    
    if(!hub.isArray(value)) throw "Expects toMany attribute to be an array";
    
    var len = value.get('length');
    for(var i=0;i<len;i++) {
      ret[i] = value.objectAt(i).get('id');
    }
    
    return ret;
  },
  
  /**
    Called by an inverse relationship whenever the receiver is no longer part
    of the relationship.  If this matches the inverse setting of the attribute
    then it will update itself accordingly.

    You should never call this directly.
    
    @param {hub.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {hub.Record} inverseRecord record that was removed from inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidRemoveRecord: function(record, key, inverseRecord, inverseKey) {
    var manyArray = record.get(key);
    if (manyArray) {
      manyArray.removeInverseRecord(inverseRecord);
    }
  },
  
  /**
    Called by an inverse relationship whenever the receiver is added to the 
    inverse relationship.  This will set the value of this inverse record to 
    the new record.
    
    You should never call this directly.
    
    @param {hub.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {hub.Record} inverseRecord record that was added to inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidAddRecord: function(record, key, inverseRecord, inverseKey) {
    var manyArray = record.get(key);
    if (manyArray) {
      manyArray.addInverseRecord(inverseRecord);
    }
  }
  
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  hub.SingleAttribute is a subclass of hub.RecordAttribute that handles to-one
  relationships.

  There are many ways you can configure a hub.SingleAttribute:
  
  {{{
    group: hub.Record.toOne('MyApp.Group', { 
      inverse: 'contacts', // set the key used to represent the inverse 
      isMaster: true|false, // indicate whether changing this should dirty
      transform: function(), // transforms value <=> storeKey,
      isEditable: true|false, make editable or not
    });
  }}}
  
  @class
  @extends hub.RecordAttribute
*/
hub.SingleAttribute = hub.RecordAttribute.extend(
  /** @scope hub.SingleAttribute.prototype */ {

  /**
    Specifies the property on the member record that represents the inverse
    of the current relationship.  If set, then modifying this relationship
    will also alter the opposite side of the relationship.
    
    @property {String}
  */
  inverse: null,
  
  /**
    If set, determines that when an inverse relationship changes whether this
    record should become dirty also or not.
    
    @property {Boolean}
  */
  isMaster: true,
  
  
  /**
    @private - implements support for handling inverse relationships.
  */
  call: function(record, key, newRec) {
    var attrKey = this.get('key') || key,
        inverseKey, isMaster, oldRec, attr, ret, nvalue;
    
    // WRITE
    if (newRec !== undefined) {

      // can only take other records or null
      if (newRec && !hub.kindOf(newRec, hub.Record)) {
        throw hub.fmt("%@ is not an instance of hub.Record", newRec);
      }

      inverseKey = this.get('inverse');
      if (inverseKey) oldRec = this._hub_scsa_call(record, key);

      // careful: don't overwrite value here.  we want the return value to 
      // cache.
      nvalue = this.fromType(record, key, newRec) ; // convert to attribute.
      record.writeAttribute(attrKey, nvalue, !this.get('isMaster')); 
      ret = newRec ;

      // ok, now if we have an inverse relationship, get the inverse 
      // relationship and notify it of what is happening.  This will allow it
      // to update itself as needed.  The callbacks implemented here are 
      // supported by both SingleAttribute and ManyAttribute.
      //
      if (inverseKey && (oldRec !== newRec)) {
        if (oldRec && (attr = oldRec[inverseKey])) {
          attr.inverseDidRemoveRecord(oldRec, inverseKey, record, key);
        }

        if (newRec && (attr = newRec[inverseKey])) {
          attr.inverseDidAddRecord(newRec, inverseKey, record, key);
        }
      }
      
    // READ 
    } else ret = this._hub_scsa_call(record, key, newRec);

    return ret ;
  },
  
  /** @private - save original call() impl */
  _hub_scsa_call: hub.RecordAttribute.prototype.call,
  
  /**
    Called by an inverse relationship whenever the receiver is no longer part
    of the relationship.  If this matches the inverse setting of the attribute
    then it will update itself accordingly.
    
    @param {hub.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {hub.Record} inverseRecord record that was removed from inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidRemoveRecord: function(record, key, inverseRecord, inverseKey) {

    var myInverseKey  = this.get('inverse'),
        curRec   = this._hub_scsa_call(record, key),
        isMaster = this.get('isMaster'), attr;

    // ok, you removed me, I'll remove you...  if isMaster, notify change.
    record.writeAttribute(key, null, !isMaster);
    record.notifyPropertyChange(key);

    // if we have another value, notify them as well...
    if ((curRec !== inverseRecord) || (inverseKey !== myInverseKey)) {
      if (curRec && (attr = curRec[myInverseKey])) {
        attr.inverseDidRemoveRecord(curRec, myInverseKey, record, key);
      }
    }
  },
  
  /**
    Called by an inverse relationship whenever the receiver is added to the 
    inverse relationship.  This will set the value of this inverse record to 
    the new record.
    
    @param {hub.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {hub.Record} inverseRecord record that was added to inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidAddRecord: function(record, key, inverseRecord, inverseKey) {
    
    var myInverseKey  = this.get('inverse'),
        curRec   = this._hub_scsa_call(record, key),
        isMaster = this.get('isMaster'), 
        attr, nvalue; 

    // ok, replace myself with the new value...
    nvalue = this.fromType(record, key, inverseRecord); // convert to attr.
    record.writeAttribute(key, nvalue, !isMaster);
    record.notifyPropertyChange(key);

    // if we have another value, notify them as well...
    if ((curRec !== inverseRecord) || (inverseKey !== myInverseKey)) {
      if (curRec && (attr = curRec[myInverseKey])) {
        attr.inverseDidRemoveRecord(curRec, myInverseKey, record, key);
      }
    }
  }

});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  A ManyArray is used to map an array of record ids back to their 
  record objects which will be materialized from the owner store on demand.
  
  Whenever you create a toMany() relationship, the value returned from the 
  property will be an instance of ManyArray.  You can generally customize the
  behavior of ManyArray by passing settings to the toMany() helper.
  
  @class
  @extends hub.Enumerable
  @extends hub.Array
*/

hub.ManyArray = hub.Object.extend(hub.Enumerable, hub.Array,
  /** @scope hub.ManyArray.prototype */ {

  /**
    recordType will tell what type to transform the record to when
    materializing the record.

    @property {String}
  */
  recordType: null,
  
  /**
    If set, the record will be notified whenever the array changes so that 
    it can change its own state
    
    @property {hub.Record}
  */
  record: null,
  
  /**
    If set will be used by the many array to get an editable version of the
    storeIds from the owner.
    
    @property {String}
  */
  propertyName: null,
  
  
  /**
    The ManyAttribute that created this array.
  
    @property {hub.ManyAttribute}
  */
  manyAttribute: null,
  
  /**
    The store that owns this record array.  All record arrays must have a 
    store to function properly.

    @property {hub.Store}
  */
  store: function() {
    return this.get('record').get('store');
  }.property('record').cacheable(),
  
  /**
    The storeKey for the parent record of this many array.  Editing this 
    array will place the parent record into a READY_DIRTY state.

    @property {Number}
  */
  storeKey: function() {
    return this.get('record').get('storeKey');
  }.property('record').cacheable(),


  /**
    Returns the storeIds in read only mode.  Avoids modifying the record 
    unnecessarily.
    
    @property {hub.Array}
  */
  readOnlyStoreIds: function() {
    return this.get('record').readAttribute(this.get('propertyName'));
  }.property(),
  
  
  /**
    Returns an editable array of storeIds.  Marks the owner records as 
    modified. 
    
    @property {hub.Array}
  */
  editableStoreIds: function() {
    var store    = this.get('store'),
        storeKey = this.get('storeKey'),
        pname    = this.get('propertyName'),
        ret, hash;
        
    ret = store.readEditableProperty(storeKey, pname);    
    if (!ret) {
      hash = store.readEditableDataHash(storeKey);
      ret = hash[pname] = [];      
    }
    
    if (ret !== this._hub_prevStoreIds) this.recordPropertyDidChange();
    return ret ;
  }.property(),
  
  
  // ..........................................................
  // COMPUTED FROM OWNER
  // 
  
  /**
    Computed from owner many attribute
    
    @property {Boolean}
  */
  isEditable: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? attr.get('isEditable') : false;
  }.property('manyAttribute').cacheable(),
  
  /**
    Computed from owner many attribute
    
    @property {String}
  */
  inverse: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? attr.get('inverse') : null;
  }.property('manyAttribute').cacheable(),
  
  /**
    Computed from owner many attribute
    
    @property {Boolean}
  */
  isMaster: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? attr.get('isMaster') : null;
  }.property("manyAttribute").cacheable(),

  /**
    Computed from owner many attribute
    
    @property {Array}
  */
  orderBy: function() {
    // NOTE: can't use get() b/c manyAttribute looks like a computed prop
    var attr = this.manyAttribute;
    return attr ? attr.get('orderBy') : null;
  }.property("manyAttribute").cacheable(),
  
  // ..........................................................
  // ARRAY PRIMITIVES
  // 

  /** @private
    Returned length is a pass-through to the storeIds array.
    
    @property {Number}
  */
  length: function() {
    var storeIds = this.get('readOnlyStoreIds');
    return storeIds ? storeIds.get('length') : 0;
  }.property('readOnlyStoreIds').cacheable(),

  /** @private
    Looks up the store id in the store ids array and materializes a
    records.
  */
  objectAt: function(idx) {
    var recs      = this._hub_records, 
        storeIds  = this.get('readOnlyStoreIds'),
        store     = this.get('store'),
        recordType = this.get('recordType'),
        storeKey, ret, storeId ;
        
    if (!storeIds || !store) return undefined; // nothing to do
    if (recs && (ret=recs[idx])) return ret ; // cached

    // not in cache, materialize
    if (!recs) this._hub_records = recs = [] ; // create cache
    storeId = storeIds.objectAt(idx);
    if (storeId) {

      // if record is not loaded already, then ask the data source to 
      // retrieve it
      storeKey = store.storeKeyFor(recordType, storeId);
      
      if (store.readStatus(storeKey) === hub.Record.EMPTY) {
        store.retrieveRecord(recordType, null, storeKey);
      }
      
      recs[idx] = ret = store.materializeRecord(storeKey);
    }
    return ret ;
  },

  /** @private
    Pass through to the underlying array.  The passed in objects must be
    records, which can be converted to storeIds.
  */
  replace: function(idx, amt, recs) {
    
    if (!this.get('isEditable')) {
      throw hub.fmt("%@.%@[] is not editable", this.get('record'), this.get('propertyName'));
    }
    
    var storeIds = this.get('editableStoreIds'), 
        len      = recs ? (recs.get ? recs.get('length') : recs.length) : 0,
        record   = this.get('record'),
        pname    = this.get('propertyName'),
        i, keys, ids, toRemove, inverse, attr, inverseRecord;

    // map to store keys
    ids = [] ;
    for(i=0;i<len;i++) ids[i] = recs.objectAt(i).get('id');

    // if we have an inverse - collect the list of records we are about to 
    // remove
    inverse = this.get('inverse');
    if (inverse && amt>0) {
      toRemove = hub.ManyArray._hub_toRemove;
      if (toRemove) hub.ManyArray._hub_toRemove = null; // reuse if possible
      else toRemove = [];
      
      for(i=0;i<amt;i++) toRemove[i] = this.objectAt(i);
    }
    
    // pass along - if allowed, this should trigger the content observer 
    storeIds.replace(idx, amt, ids);

    // ok, notify records that were removed then added; this way reordered
    // objects are added and removed
    if (inverse) {
      
      // notive removals
      for(i=0;i<amt;i++) {
        inverseRecord = toRemove[i];
        attr = inverseRecord ? inverseRecord[inverse] : null;
        if (attr && attr.inverseDidRemoveRecord) {
          attr.inverseDidRemoveRecord(inverseRecord, inverse, record, pname);
        }
      }

      if (toRemove) {
        toRemove.length = 0; // cleanup
        if (!hub.ManyArray._hub_toRemove) hub.ManyArray._hub_toRemove = toRemove;
      }

      // notify additions
      for(i=0;i<len;i++) {
        inverseRecord = recs.objectAt(i);
        attr = inverseRecord ? inverseRecord[inverse] : null;
        if (attr && attr.inverseDidAddRecord) {
          attr.inverseDidAddRecord(inverseRecord, inverse, record, pname);
        }
      }
      
    }

    // only mark record dirty if there is no inverse or we are master
    if (record && (!inverse || this.get('isMaster'))) {
      record.recordDidChange(pname);
    } 
    
    return this;
  },
  
  // ..........................................................
  // INVERSE SUPPORT
  // 
  
  /**
    Called by the ManyAttribute whenever a record is removed on the inverse
    of the relationship.
    
    @param {hub.Record} inverseRecord the record that was removed
    @returns {hub.ManyArray} receiver
  */
  removeInverseRecord: function(inverseRecord) {
    
    if (!inverseRecord) return this; // nothing to do
    var id = inverseRecord.get('id'),
        storeIds = this.get('editableStoreIds'),
        idx      = (storeIds && id) ? storeIds.indexOf(id) : -1,
        record;
    
    if (idx >= 0) {
      storeIds.removeAt(idx);
      if (this.get('isMaster') && (record = this.get('record'))) {
        record.recordDidChange(this.get('propertyName'));
      }
    }
  },

  /**
    Called by the ManyAttribute whenever a record is added on the inverse
    of the relationship.
    
    @param {hub.Record} record the record this array is a part of
    @param {String} key the key this array represents
    @param {hub.Record} inverseRecord the record that was removed
    @param {String} inverseKey the name of inverse that was changed
    @returns {hub.ManyArray} receiver
  */
  addInverseRecord: function(inverseRecord) {
    
    if (!inverseRecord) return this;
    var id = inverseRecord.get('id'),
        storeIds = this.get('editableStoreIds'),
        orderBy  = this.get('orderBy'),
        len      = storeIds.get('length'),
        idx, record;
        
    // find idx to insert at.
    if (orderBy) {
      idx = this._hub_findInsertionLocation(inverseRecord, 0, len, orderBy);
    } else idx = len;
    
    storeIds.insertAt(idx, inverseRecord.get('id'));
    if (this.get('isMaster') && (record = this.get('record'))) {
      record.recordDidChange(this.get('propertyName'));
    }
  },
  
  // binary search to find insertion location
  _hub_findInsertionLocation: function(rec, min, max, orderBy) {
    var idx   = min+Math.floor((max-min)/2),
        cur   = this.objectAt(idx),
        order = this._hub_compare(rec, cur, orderBy);
    if (order < 0) {
      if (idx===0) return idx;
      else return this._hub_findInsertionLocation(rec, 0, idx, orderBy);
    } else if (order > 0) {
      if (idx >= max) return idx;
      else return this._hub_findInsertionLocation(rec, idx, max, orderBy);
    } else return idx;
  },

  _hub_compare: function(a, b, orderBy) {
    var t = hub.typeOf(orderBy),
        ret, idx, len;
        
    if (t === hub.T_FUNCTION) ret = orderBy(a, b);
    else if (t === hub.T_STRING) ret = hub.compare(a,b);
    else {
      len = orderBy.get('length');
      ret = 0;
      for(idx=0;(ret===0) && (idx<len);idx++) ret = hub.compare(a,b);
    }

    return ret ;
  },
  
  // ..........................................................
  // INTERNAL SUPPORT
  //  

  /** @private 
    Invoked whenever the storeIds array changes.  Observes changes.
  */
  recordPropertyDidChange: function(keys) {
    
    if (keys && !keys.contains(this.get('propertyName'))) return this;
    
    var storeIds = this.get('readOnlyStoreIds');
    var prev = this._hub_prevStoreIds, f = this._hub_storeIdsContentDidChange;

    if (storeIds === prev) return this; // nothing to do

    if (prev) prev.removeObserver('[]', this, f);
    this._hub_prevStoreIds = storeIds;
    if (storeIds) storeIds.addObserver('[]', this, f);

    var rev = (storeIds) ? storeIds.propertyRevision : -1 ;
    this._hub_storeIdsContentDidChange(storeIds, '[]', storeIds, rev);
    
  },

  /** @private
    Invoked whenever the content of the storeIds array changes.  This will
    dump any cached record lookup and then notify that the enumerable content
    has changed.
  */
  _hub_storeIdsContentDidChange: function(target, key, value, rev) {
    this._hub_records = null ; // clear cache
    this.enumerableContentDidChange();
  },
  
  /** @private */
  unknownProperty: function(key, value) {
    var ret = this.reducedProperty(key, value);
    return ret === undefined ? arguments.callee.base.apply(this, arguments) : ret ;
  },

  /** @private */
  init: function() {
    arguments.callee.base.apply(this, arguments) ;
    this.recordPropertyDidChange() ;
  }
  
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub hub_precondition */

/**
  hub.Store is where you can find all of your attribute hashes. Stores can be 
  chained for editing purposes and committed back one chain level at a time 
  all the way back to a persistent data source.
  
  Most of the time you should use the hub.Hub subclass of hub.Store that 
  supports object graph sync and offline data storage. It's both more powerful 
  and simpler to use.
  
  Every application you create will generally have its own hub.Store object.
  Once you create the store, you will rarely need to work with the store
  directly except to retrieve records and collections.
  
  Internally, the store will keep track of changes to your json data hashes
  and manage syncing those changes with your data source.  A data source may
  be a server, local storage, or any other persistent code.
  
  @class
  @extends hub.Object
*/
hub.Store = hub.Object.extend(
/** @scope hub.Store.prototype */ {
  
  /**
    An (optional) name of the store, which can be useful during debugging,
    especially if you have multiple nested stores.
    
    @property {String}
  */
  name: null,

  /**
    An array of all the chained stores that current rely on the receiver 
    store.
    
    @property {Array}
  */
  nestedStores: null,
  
  /**
    The data source is the persistent storage that will provide data to the
    store and save changes.  You normally will set your data source when you
    first create your store in your application.
    
    @property {hub.DataSource}
  */
  dataSource: null,
  
  /**
    This type of store is not nested.
    
    @property {Boolean}
  */
  isNested: false,
  
  /**
    This type of store is not nested.
    
    @property {Boolean}
  */
  commitRecordsAutomatically: false,
  
  // ..........................................................
  // DATA SOURCE SUPPORT
  // 
  
  /**
    Convenience method.  Sets the current data source to the passed property.
    This will also set the store property on the dataSource to the receiver.
    
    If you are using this from the core.js method of your app, you may need to
    just pass a string naming your data source class.  If this is the case,
    then your data source will be instantiated the first time it is requested.
    
    @param {hub.DataSource|String} dataSource the data source
    @returns {hub.Store} receiver
  */
  from: function(dataSource) {
    this.set('dataSource', dataSource);
    return this ;
  },
  
  // lazily convert data source to real object
  _hub_getDataSource: function() {
    var ret = this.get('dataSource');
    if (typeof ret === hub.T_STRING) {
      ret = hub.objectForPropertyPath(ret);
      if (ret) ret = ret.create();
      if (ret) this.set('dataSource', ret);
    }
    return ret;
  },
  
  /**
    Convenience method.  Creates a CascadeDataSource with the passed 
    data source arguments and sets the CascadeDataSource as the data source 
    for the receiver.
    
    @param {hub.DataSource...} dataSource one or more data source arguments
    @returns {hub.Store} reciever
  */
  cascade: function(dataSource) {
    var dataSources = hub.A(arguments) ;
    dataSource = hub.CascadeDataSource.create({
      dataSources: dataSources 
    });
    return this.from(dataSource);
  },
  
  // ..........................................................
  // STORE CHAINING
  // 
  
  editingContextClass: 'hub.EditingContext',
  
  /**  
    Returns a new editing context instance that can be used to buffer changes
    until you are ready to commit them.  When you are ready to commit your 
    changes, call commitChanges() or destroyChanges() and then destroy() when
    you are finished with the editing context altogether.
    
    {{{
      editingContext = MyApp.store.createEditingContext() ;
      .. fetch records
      .. edit edit edit
      editingContext.commitChanges().destroy() ;
    }}}
    
    @param {Hash} attrs optional attributes to set on new store
    @param {Class} editingContextClass optional the class of the newly-created editing context (defaults to this.editingContextClass)
    @returns {hub.ChildStore|editingContextClass} new editing context with receiver as parent
  */
  createEditingContext: function(attrs, editingContextClass) {
    if (!attrs) attrs = {};
    attrs.parentStore = this;
    
    if (editingContextClass) {
      // Ensure the passed-in class is a type of child store.
      if (hub.typeOf(editingContextClass) !== 'class') {
        throw new Error(hub.fmt("%@ is not a valid class", editingContextClass)) ;
      }
    }
    else {
      editingContextClass = this.editingContextClass ;
      if (typeof editingContextClass === 'string') {
        // convert to class and cache
        editingContextClass = this.editingContextClass = hub.objectForPropertyPath(editingContextClass) ;
        if (hub.typeOf(editingContextClass) !== 'class') {
          throw new Error(hub.fmt("%@ is not a valid class", editingContextClass)) ;
        }
      }
    }
    
    var ret = editingContextClass.create(attrs),
        nested = this.nestedStores;
    
    if (!ret.isChildStore) {
      throw new Error(hub.fmt("%@ did not mixin hub.ChildStore", editingContextClass)) ;
    }
    
    if (!nested) nested = this.nestedStores = [] ;
    nested.push(ret) ;
    return ret ;
  },
  
  /** @private
  
    Called by a nested store just before it is destroyed so that the parent
    can remove the store from its list of nested stores.
    
    @returns {hub.Store} receiver
  */
  willDestroyNestedStore: function(nestedStore) {
    if (this.nestedStores) {
      this.nestedStores.removeObject(nestedStore);
    }
    return this ;
  },

  /**
    Used to determine if a nested store belongs directly or indirectly to the
    receiver.
    
    @param {hub.Store} store store instance
    @returns {Boolean} true if belongs
  */
  hasNestedStore: function(store) {
    while(store && (store !== this)) store = store.get('parentStore');
    return store === this ;
  },
  
  // ..........................................................
  // SHARED DATA STRUCTURES 
  // 
  
  /** @private
    JSON data hashes indexed by store key.  
    
    *IMPORTANT: Property is not observable*
    
    Shared by a store and its child stores until you make edits to it.
    
    @property {Hash}
  */
  dataHashes: null,
  
  /** @private
    The current status of a data hash indexed by store key.
    
    *IMPORTANT: Property is not observable*
    
    Shared by a store and its child stores until you make edits to it.
    
    @property {Hash}
  */
  statuses: null,
    
  /** @private
    This array contains the revisions for the attributes indexed by the 
    storeKey.  
    
    *IMPORTANT: Property is not observable*
    
    Revisions are used to keep track of when an attribute hash has been 
    changed. A store shares the revisions data with its parent until it 
    starts to make changes to it.
    
    @property {Hash}
  */
  revisions: null,
  
  /**
    Array indicates whether a data hash is possibly in use by an external 
    record for editing.  If a data hash is editable then it may be modified
    at any time and therefore chained stores may need to clone the 
    attributes before keeping a copy of them.
  
    Note that this is kept as an array because it will be stored as a dense 
    array on some browsers, making it faster.
    
    @property {Array}
  */
  editables: null,
    
  /**
    A set of storeKeys that need to be committed back to the data source. If
    you call commitRecords() without passing any other parameters, the keys
    in this set will be committed instead.
    
    @property {Array}
  */
  changelog: null,
  
  /**
    A set of hub.RecordArray that have been returned from find with an 
    hub.Query. These will all be notified with _notifyRecordArraysWithQuery() 
    whenever the store changes.
    
    @property {Array}
  */
  recordArraysWithQuery: null,
  
  /**
    An array of hub.Error objects associated with individual records in the
    store (indexed by store keys).
    
    Errors passed form the data source in the call to dataSourceDidError() are
    stored here.
    
    @property {Array}
  */
  recordErrors: null,
  
  /**
    A hash of hub.Error objects associated with queries (indexed by the GUID
    of the query).
    
    Errors passed from the data source in the call to dataSourceDidErrorQuery()
    are stored here.
    
    @property {Hash}
  */
  queryErrors: null,
  
  // ..........................................................
  // CORE ATTRIBUTE API
  // 
  // The methods in this layer work on data hashes in the store.  They do not
  // perform any changes that can impact records.  Usually you will not need 
  // to use these methods.
  
  /**
    Returns the current edit status of a storekey.  May be one of EDITABLE or
    LOCKED.  Used mostly for unit testing.
    
    @param {Number} storeKey the store key
    @returns {Number} edit status
  */
  storeKeyEditState: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var editables = this.editables, locks = this.locks;
    return (editables && editables[storeKey]) ? hub.Store.EDITABLE : hub.Store.LOCKED ;
  },
   
  /** 
    Returns the data hash for the given storeKey.  This will also 'lock'
    the hash so that further edits to the parent store will no 
    longer be reflected in this store until you reset.
    
    @param {Number} storeKey key to retrieve
    @returns {Hash} data hash or null
  */
  readDataHash: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    return this.dataHashes[storeKey];
  },
  
  /** 
    Returns the data hash for the storeKey, cloned so that you can edit
    the contents of the attributes if you like.  This will do the extra work
    to make sure that you only clone the attributes one time.  
    
    If you use this method to modify data hash, be sure to call 
    dataHashDidChange() when you make edits to record the change.
    
    @param {Number} storeKey the store key to retrieve
    @returns {Hash} the attributes hash
  */
  readEditableDataHash: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    // read the value - if there is no hash just return; nothing to do
    var ret = this.dataHashes[storeKey];
    if (!ret) return ret ; // nothing to do.

    // clone data hash if not editable
    var editables = this.editables;
    if (!editables) editables = this.editables = [];
    if (!editables[storeKey]) {
      editables[storeKey] = 1 ; // use number to store as dense array
      ret = this.dataHashes[storeKey] = hub.clone(ret);
    }
    return ret;
  },
  
  /**
    Reads a property from the hash - cloning it if needed so you can modify 
    it independently of any parent store.  This method is really only well
    tested for use with toMany relationships.  Although it is public you 
    generally should not call it directly.
    
    @param {Number} storeKey storeKey of data hash 
    @param {String} propertyName property to read
    @returns {Object} editable property value
  */
  readEditableProperty: function(storeKey, propertyName) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var hash      = this.readEditableDataHash(storeKey), 
        editables = this.editables[storeKey], // get editable info...
        ret       = hash[propertyName];
        
    // editables must be made into a hash so that we can keep track of which
    // properties have already been made editable
    if (editables === 1) editables = this.editables[storeKey] = {};
    
    // clone if needed
    if (!editables[propertyName]) {
      ret = hash[propertyName];
      if (ret && ret.isCopyable) ret = hash[propertyName] = ret.copy();
      editables[propertyName] = true ;
    }
    
    return ret ;
  },
  
  /**
    Replaces the data hash for the storeKey.  This will lock the data hash and
    mark them as cloned.  This will also call dataHashDidChange() for you.
    
    Note that the hash you set here must be a different object from the 
    original data hash.  Once you make a change here, you must also call
    dataHashDidChange() to register the changes.
    
    If the data hash does not yet exist in the store, this method will add it.
    Pass the optional status to edit the status as well.
    
    @param {Number} storeKey the store key to write
    @param {Hash} hash the new hash
    @param {String} status the new hash status
    @returns {hub.Store} receiver
  */
  writeDataHash: function(storeKey, hash, status) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    // update dataHashes and optionally status.
    if (hash) this.dataHashes[storeKey] = hash;
    if (status) this.statuses[storeKey] = status ;
    
    // also note that this hash is now editable
    var editables = this.editables;
    if (!editables) editables = this.editables = [];
    editables[storeKey] = 1 ; // use number for dense array support
    
    return this ;
  },
  
  /**
    Removes the data hash from the store.  This does not imply a deletion of
    the record.  You could be simply unloading the record.  Eitherway, 
    removing the dataHash will be synced back to the parent store but not to 
    the server.
    
    Note that you can optionally pass a new status to go along with this. If
    you do not pass a status, it will change the status to hub.Record.EMPTY
    (assuming you just unloaded the record).  If you are deleting the record
    you may set it to hub.Record.DESTROYED_CLEAN.
    
    Be sure to also call dataHashDidChange() to register this change.
    
    @param {Number} storeKey
    @param {String} status optional new status
    @returns {hub.Store} reciever
  */
  removeDataHash: function(storeKey, status) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var rev ;
    
     // don't use delete -- that will allow parent dataHash to come through
    this.dataHashes[storeKey] = null;  
    this.statuses[storeKey] = status || hub.Record.EMPTY;
    rev = this.revisions[storeKey] = this.revisions[storeKey]; // copy ref
    
    // hash is gone and therefore no longer editable
    var editables = this.editables;
    if (editables) editables[storeKey] = 0 ;
    
    return this ;    
  },
  
  /**
    Reads the current status for a storeKey.  This will also lock the data 
    hash.  If no status is found, returns hub.Record.EMPTY.
    
    @param {Number} storeKey the store key
    @returns {Number} status
  */
  readStatus: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    // use readDataHash to handle optimistic locking.  this could be inlined
    // but for now this minimized copy-and-paste code.
    this.readDataHash(storeKey);
    return this.statuses[storeKey] || hub.Record.EMPTY;
  },
  
  /**
    Reads the current status for the storeKey without actually locking the 
    record.  Usually you won't need to use this method.  It is mostly used
    internally.
    
    @param {Number} storeKey the store key
    @returns {Number} status
  */
  peekStatus: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    return this.statuses[storeKey] || hub.Record.EMPTY;  
  },
  
  /**
    Writes the current status for a storeKey.  If the new status is 
    hub.Record.ERROR, you may also pass an optional error object.  Otherwise 
    this param is ignored.
    
    @param {Number} storeKey the store key
    @param {String} newStatus the new status
    @param {hub.Error} error optional error object
    @returns {hub.Store} receiver
  */
  writeStatus: function(storeKey, newStatus) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    // use writeDataHash for now to handle optimistic lock.  maximize code 
    // reuse.
    return this.writeDataHash(storeKey, null, newStatus);
  },
  
  /**
    Call this method whenever you modify some editable data hash to register
    with the Store that the attribute values have actually changed.  This will
    do the book-keeping necessary to track the change across stores including 
    managing locks.
    
    @param {Number|Array} storeKeys one or more store keys that changed
    @param {Number} rev optional new revision number. normally leave null
    @param {Boolean} statusOnly (optional) true if only status changed
    @param {String} key that changed (optional)
    @returns {hub.Store} receiver
  */
  dataHashDidChange: function(storeKeys, rev, statusOnly, key) {
    
    // update the revision for storeKey.  Use generateStoreKey() because that
    // gaurantees a universally (to this store hierarchy anyway) unique 
    // key value.
    if (!rev) rev = hub.Store.generateStoreKey();
    var isArray, len, idx, storeKey;
    
    isArray = hub.typeOf(storeKeys) === hub.T_ARRAY;
    if (isArray) {
      len = storeKeys.length;
    } else {
      len = 1;
      storeKey = storeKeys;
    }
    
    for(idx=0;idx<len;idx++) {
      if (isArray) storeKey = storeKeys[idx];
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      this.revisions[storeKey] = rev;
      this._hub_notifyRecordPropertyChange(storeKey, statusOnly, key);
    }
    
    return this ;
  },
  
  /** @private */
  _hub_notifyRecordPropertyChange: function(storeKey, statusOnly, key) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var records      = this.records, 
        nestedStores = this.get('nestedStores'),
        K            = hub.Store,
        rec, editState, len, idx, store, status, keys;
    
    // pass along to nested stores
    len = nestedStores ? nestedStores.length : 0 ;
    for(idx=0;idx<len;idx++) {
      store = nestedStores[idx];
      status = store.peekStatus(storeKey); // important: peek avoids read-lock
      editState = store.storeKeyEditState(storeKey);
      
      // when store needs to propagate out changes in the parent store
      // to nested stores
      if (editState === K.INHERITED) {
        store._hub_notifyRecordPropertyChange(storeKey, statusOnly, key);

      } else if (status & hub.Record.BUSY) {
        // make sure nested store does not have any changes before resetting
        if(store.get('hasChanges')) throw K.CHAIN_CONFLICT_ERROR;
        store.reset();
      }
    }
    
    // store info in changes hash and schedule notification if needed.
    var changes = this.recordPropertyChanges;
    if (!changes) {
      changes = this.recordPropertyChanges = 
        { storeKeys:      hub.CoreSet.create(),
          records:        hub.CoreSet.create(),
          hasDataChanges: hub.CoreSet.create(),
          propertyForStoreKeys: {} };
    }
    
    changes.storeKeys.add(storeKey);

    if (records && (rec=records[storeKey])) {
      changes.records.push(storeKey);
      
      // If there are changes other than just the status we need to record
      // that information so we do the right thing during the next flush.
      // Note that if we're called multiple times before flush and one call
      // has statusOnly=true and another has statusOnly=false, the flush will
      // (correctly) operate in statusOnly=false mode.
      if (!statusOnly) changes.hasDataChanges.push(storeKey);
      
      // If this is a key specific change, make sure that only those
      // properties/keys are notified.  However, if a previous invocation of
      // _notifyRecordPropertyChange specified that all keys have changed, we
      // need to respect that.
      if (key) {
        if (!(keys = changes.propertyForStoreKeys[storeKey])) {
          keys = changes.propertyForStoreKeys[storeKey] = hub.CoreSet.create();
        }
        
        // If it's '*' instead of a set, then that means there was a previous
        // invocation that said all keys have changed.
        if (keys !== '*') {
          keys.add(key);
        }
      }
      else {
        // Mark that all properties have changed.
        changes.propertyForStoreKeys[storeKey] = '*';
      }
    }
    
    this.flush();
    return this;
  },

  /**
    Delivers any pending changes to materialized records.  You normally do not 
    need to call this.
    
    @returns {hub.Store} receiver
  */
  flush: function() {
    if (!this.recordPropertyChanges) return this;
    
    var changes              = this.recordPropertyChanges,
        storeKeys            = changes.storeKeys,
        hasDataChanges       = changes.hasDataChanges,
        records              = changes.records,
        propertyForStoreKeys = changes.propertyForStoreKeys,
        recordTypes = hub.CoreSet.create(),
        rec, recordType, statusOnly, idx, len, storeKey, keys;
    
    storeKeys.forEach(function(storeKey) {
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      if (records.contains(storeKey)) {
        statusOnly = hasDataChanges.contains(storeKey) ? false : true;
        rec = this.records[storeKey];
        keys = propertyForStoreKeys ? propertyForStoreKeys[storeKey] : null;
        
        // Are we invalidating all keys?  If so, don't pass any to
        // storeDidChangeProperties.
        if (keys === '*') keys = null;
        
        // remove it so we don't trigger this twice
        records.remove(storeKey);
        
        if (rec) rec.storeDidChangeProperties(statusOnly, keys);
      }
      
      recordType = hub.Store.recordTypeFor(storeKey);
      recordTypes.add(recordType);
      
    }, this);

    this._hub_notifyRecordArrays(storeKeys, recordTypes);

    storeKeys.clear();
    hasDataChanges.clear();
    records.clear();
    // Provide full reference to overwrite
    this.recordPropertyChanges.propertyForStoreKeys = {};
    
    return this;
  },
  
  /**
    Resets the store content.  This will clear all internal data for all
    records, resetting them to an EMPTY state.  You generally do not want
    to call this method yourself, though you may override it.
    
    @returns {hub.Store} receiver
  */
  reset: function() {
    
    // create a new empty data store
    this.dataHashes = {} ;
    this.revisions  = {} ;
    this.statuses   = {} ;
    
    // also reset temporary objects and errors
    this.chainedChanges = this.locks = this.editables = null;
    this.changelog = null ;
    this.recordErrors = null;
    this.queryErrors = null;
    
    var records = this.records, storeKey;
    if (records) {
      for(storeKey in records) {
        hub_precondition(typeof storeKey === hub.T_NUMBER);
        if (!records.hasOwnProperty(storeKey)) continue ;
        this._hub_notifyRecordPropertyChange(storeKey, false);
      }
    }
    
    this.set('hasChanges', false);
  },
  
  /** @private
    Called by a nested store on a parent store to commit any changes from the
    store.  This will copy any changed dataHashes as well as any persistant 
    change logs.
    
    If the parentStore detects a conflict with the optimistic locking, it will
    raise an exception before it makes any changes.  If you pass the 
    force flag then this detection phase will be skipped and the changes will
    be applied even if another resource has modified the store in the mean
    time.
    
    @param {hub.Store} nestedStore the child store
    @param {Array} changes the array of changed store keys
    @param {Boolean} force
    @returns {hub.Store} receiver
  */
  commitChangesFromNestedStore: function(nestedStore, changes, force) {
    // first, check for optimistic locking problems
    if (!force) this._hub_verifyLockRevisions(changes, nestedStore.locks);
    
    // OK, no locking issues.  So let's just copy them changes. 
    // get local reference to values.
    var len = changes.length, i, storeKey, myDataHashes, myStatuses, 
      myEditables, myRevisions, chDataHashes, chStatuses, chRevisions;
    
    myRevisions  = this.revisions ;
    myDataHashes = this.dataHashes;
    myStatuses   = this.statuses;
    myEditables  = this.editables ;
    
    // setup some arrays if needed
    if (!myEditables) myEditables = this.editables = [] ;
    
    chDataHashes = nestedStore.dataHashes;
    chRevisions  = nestedStore.revisions ;
    chStatuses   = nestedStore.statuses;
    
    for(i=0;i<len;i++) {
      storeKey = changes[i];
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      // now copy changes
      myDataHashes[storeKey] = chDataHashes[storeKey];
      myStatuses[storeKey]   = chStatuses[storeKey];
      myRevisions[storeKey]  = chRevisions[storeKey];
      
      myEditables[storeKey] = 0 ; // always make dataHash no longer editable
      
      this._hub_notifyRecordPropertyChange(storeKey, false);
    }
    
    // add any records to the changelog for commit handling
    var myChangelog = this.changelog, chChangelog = nestedStore.changelog;
    if (chChangelog) {
      if (!myChangelog) myChangelog = this.changelog = hub.CoreSet.create();
      myChangelog.addEach(chChangelog);
    }  
    this.changelog = myChangelog;
    
    // immediately flush changes to notify records - nested stores will flush
    // later on.
    if (!this.get('parentStore')) this.flush();
    
    return this ;
  },
  
  /** @private
    Verifies that the passed lock revisions match the current revisions 
    in the receiver store.  If the lock revisions do not match, then the 
    store is in a conflict and an exception will be raised.
    
    @param {Array}  changes set of changes we are trying to apply
    @param {hub.Set} locks the locks to verify
    @returns {hub.Store} receiver
  */
  _hub_verifyLockRevisions: function(changes, locks) {
    var len = changes.length, revs = this.revisions, i, storeKey, lock, rev ;
    if (locks && revs) {
      for(i=0;i<len;i++) {
        storeKey = changes[i];
        hub_precondition(typeof storeKey === hub.T_NUMBER);
        lock = locks[storeKey] || 1;
        rev  = revs[storeKey] || 1;
        
        // if the save revision for the item does not match the current rev
        // the someone has changed the data hash in this store and we have
        // a conflict. 
        if (lock < rev) throw hub.Store.CHAIN_CONFLICT_ERROR;
      }   
    }
    return this ;
  },
  
  // ..........................................................
  // HIGH-LEVEL RECORD API
  // 
  
  /**
    Finds a single record instance with the specified recordType and id or an 
    array of records matching some query conditions.
    
    h2. Finding a Single Record
    
    If you pass a single recordType and id, this method will return an actual
    record instance.  If the record has not been loaded into the store yet,
    this method will ask the data source to retrieve it.  If no data source
    indicates that it can retrieve the record, then this method will return
    null.
    
    Note that if the record needs to be retrieved from the server, then the
    record instance returned from this method will not have any data yet. 
    Instead it will have a status of hub.Record.READY_LOADING.  You can monitor
    the status property to be notified when the record data is available for 
    you to use it.
    
    h2. Find a Collection of Records
    
    If you pass only a record type or a query object, you can instead find 
    all records matching a specified set of conditions.  When you call find()
    in this way, it will create a query if needed and pass it to the data
    source to fetch the results.
    
    If this is the first time you have fetched the query, then the store will
    automatically ask the data source to fetch any records related to it as 
    well.  Otherwise you can refresh the query results at anytime by calling
    refresh() on the returned RecordArray.

    You can detect whether a RecordArray is fetching from the server by 
    checking its status.
    
    h2. Examples
    
    Finding a single record:
    
    {{{
      MyApp.store.find(MyApp.Contact, "23"); // returns MyApp.Contact
    }}}
    
    Finding all records of a particular type:
    
    {{{
      MyApp.store.find(MyApp.Contact); // returns hub.RecordArray of contacts
    }}}
    
    Finding all contacts with first name John:
    
    {{{
      var query = hub.Query.local(MyApp.Contact, "firstName = %@", "John");
      MyApp.store.find(query); // returns hub.RecordArray of contacts
    }}}
    
    Finding all contacts using a remote query:
    
    {{{
      var query = hub.Query.remote(MyApp.Contact);
      MyApp.store.find(query); // returns hub.RecordArray filled by server
    }}}
    
    @param {hub.Record|String} recordType the expected record type
    @param {String} id the id to load
    @returns {hub.Record} record instance or null
  */
  find: function(recordType, id) {
    
    // if recordType is passed as string, find object
    if (hub.typeOf(recordType)===hub.T_STRING) {
      recordType = hub.objectForPropertyPath(recordType);
    }
    
    // handle passing a query...
    if ((arguments.length === 1) && !(recordType && recordType.get && recordType.get('isRecord'))) {
      if (!recordType) throw new Error("hub.Store#find() must pass recordType or query");
      if (!recordType.isQuery) {
        recordType = hub.Query.local(recordType);
      }
      return this._hub_findQuery(recordType, true, true);
      
    // handle finding a single record
    } else {
      return this._hub_findRecord(recordType, id);
    }
  },
  
  _hub_findQuery: function(query, createIfNeeded, refreshIfNew) {
    // lookup the local RecordArray for this query.
    // FIXME: Rename _hub_scst_recordArraysByQuery.
    var cache = this._hub_scst_recordArraysByQuery, 
        key   = hub.guidFor(query),
        ret, ra ;
    if (!cache) cache = this._hub_scst_recordArraysByQuery = {};
    ret = cache[key];
    
    // if a RecordArray was not found, then create one and also add it to the
    // list of record arrays to update.
    if (!ret && createIfNeeded) {
      cache[key] = ret = hub.RecordArray.create({ store: this, query: query });
      
      ra = this.get('recordArrays');
      if (!ra) this.set('recordArrays', ra = hub.Set.create());
      ra.add(ret);
      
      if (refreshIfNew) this.refreshQuery(query);
    }
    
    this.flush();
    return ret ;
  },
  
  _hub_findRecord: function(recordType, id) {
    var storeKey ; 
    
    // if a record instance is passed, simply use the storeKey.  This allows 
    // you to pass a record from a chained store to get the same record in the
    // current store.
    if (recordType && recordType.get && recordType.get('isRecord')) {
      storeKey = recordType.get('storeKey');
      
    // otherwise, lookup the storeKey for the passed id.  look in subclasses 
    // as well.
    } else storeKey = id ? recordType.storeKeyFor(id) : null;
    
    if (storeKey && (this.readStatus(storeKey) === hub.Record.EMPTY)) {
      storeKey = this.retrieveRecord(recordType, id);
    }
    
    // now we have the storeKey, materialize the record and return it.
    return storeKey ? this.materializeRecord(storeKey) : null ;
  },

  // ..........................................................
  // RECORD ARRAY OPERATIONS
  // 

  /**
    Called by the record array just before it is destroyed.  This will 
    de-register it from receiving future notifications.

    You should never call this method yourself.  Instead call destroy() on the
    RecordArray directly.
    
    @param {hub.RecordArray} recordArray the record array
    @returns {hub.Store} receiver
  */
  recordArrayWillDestroy: function(recordArray) {
    var cache = this._hub_scst_recordArraysByQuery,
        set   = this.get('recordArrays');
        
    if (cache) delete cache[hub.guidFor(recordArray.get('query'))];
    if (set) set.remove(recordArray);
    return this ;
  },

  /**
    Called by the record array whenever it needs the data source to refresh
    its contents.  Nested stores will actually just pass this along to the
    parent store.  The parent store will call fetch() on the data source.

    You should never call this method yourself.  Instead call refresh() on the
    RecordArray directly.
    
    @param {hub.Query} query the record array query to refresh
    @returns {hub.Store} receiver
  */
  refreshQuery: function(query) {
    if (!query) throw new Error("refreshQuery() requires a query");

    var cache    = this._hub_scst_recordArraysByQuery,
        recArray = cache ? cache[hub.guidFor(query)] : null, 
        source   = this._hub_getDataSource();
        
    if (source && source.fetch) {
      if (recArray) recArray.storeWillFetchQuery(query);
      source.fetch.call(source, this, query);
    }
    
    return this ;      
  },
  
  /** @private 
    Will ask all record arrays that have been returned from find
    with a hub.Query to check their arrays with the new storeKeys
    
    @param {hub.IndexSet} storeKeys set of storeKeys that changed
    @param {hub.Set} recordTypes
    @returns {hub.Store} receiver
  */
  _hub_notifyRecordArrays: function(storeKeys, recordTypes) {
    var recordArrays = this.get('recordArrays');
    if (!recordArrays) return this;

    recordArrays.forEach(function(recArray) {
      if (recArray) recArray.storeDidChangeStoreKeys(storeKeys, recordTypes);
    }, this);
    
    return this ;
  },
  
  
  // ..........................................................
  // LOW-LEVEL HELPERS
  // 
  
  /**
    Array of all records currently in the store with the specified
    type.  This method only reflects the actual records loaded into memory and
    therefore is not usually needed at runtime.  However you will often use
    this method for testing.
    
    @param {hub.Record} recordType the record type
    @returns {hub.Array} array instance - usually hub.RecordArray
  */
  recordsFor: function(recordType) {
    var storeKeys = [], id, storeKey, ret,
        storeKeysById = recordType._hub_storeKeysById ;
    
    if (!storeKeysById) storeKeysById = this.storeKeysById() ;
    
    // collect all non-empty store keys
    var K = hub.Record.EMPTY ;
    for (id in storeKeysById) {
      storeKey = storeKeysById[id] ; // get the storeKey
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      if (this.readStatus(storeKey) !== K) {
        storeKeys.push(storeKey) ;
      }
    }
    
    if (storeKeys.length>0) {
      ret = hub.RecordArray.create({ store: this, storeKeys: storeKeys });
    } else ret = storeKeys; // empty array
    return ret ;
  },
  
  _hub_TMP_REC_ATTRS: {},
  
  /** 
    Given a storeKey, return a materialized record.  You will not usually
    call this method yourself.  Instead it will used by other methods when
    you find records by id or perform other searches.
    
    If a recordType has been mapped to the storeKey, then a record instance
    will be returned even if the data hash has not been requested yet.
    
    Each Store instance returns unique record instances for each storeKey.
    
    @param {Number} storeKey The storeKey for the dataHash.
    @returns {hub.Record} Returns a record instance.
  */
  materializeRecord: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var records = this.records, ret, recordType, attrs;
    
    // look up in cached records
    if (!records) records = this.records = {}; // load cached records
    ret = records[storeKey];
    if (ret) return ret;
    
    // not found -- OK, create one then.
    recordType = hub.Store.recordTypeFor(storeKey);
    if (!recordType) return null; // not recordType registered, nothing to do
    
    attrs = this._hub_TMP_REC_ATTRS ;
    attrs.storeKey = storeKey ;
    attrs.store    = this ;
    ret = records[storeKey] = recordType.create(attrs);
    
    return ret ;
  },
  
  // ..........................................................
  // CORE RECORDS API
  // 
  // The methods in this section can be used to manipulate records without 
  // actually creating record instances.
  
  /**
    Creates a new record instance with the passed recordType and dataHash.
    You can also optionally specify an id or else it will be pulled from the 
    data hash.
    
    Note that the record will not yet be saved back to the server.  To save
    a record to the server, call commitChanges() on the store.
    
    @param {hub.Record} recordType the record class to use on creation
    @param {Hash} dataHash the JSON attributes to assign to the hash.
    @param {String} id (optional) id to assign to record
    
    @returns {hub.Record} Returns the created record
  */
  createRecord: function(recordType, dataHash, id) {
    var primaryKey, storeKey, status, K = hub.Record, changelog, defaultVal;
    
    // First, try to get an id.  If no id is passed, look it up in the 
    // dataHash.
    if (!id && (primaryKey = recordType.prototype.primaryKey)) {
      id = dataHash[primaryKey];
      // if still no id, check if there is a defaultValue function for
      // the primaryKey attribute and assign that
      defaultVal = recordType.prototype[primaryKey] ? recordType.prototype[primaryKey].defaultValue : null;
      if(!id && hub.typeOf(defaultVal)===hub.T_FUNCTION) {
        id = dataHash[primaryKey] = defaultVal();
      }
    }
    
    // Next get the storeKey - base on id if available
    storeKey = id ? recordType.storeKeyFor(id) : hub.Store.generateStoreKey();
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    // now, check the state and do the right thing.
    status = this.readStatus(storeKey);
    
    // check state
    // any busy or ready state or destroyed dirty state is not allowed
    if ((status & K.BUSY)  || 
        (status & K.READY) || 
        (status == K.DESTROYED_DIRTY)) { 
      throw id ? K.RECORD_EXISTS_ERROR : K.BAD_STATE_ERROR;
      
    // allow error or destroyed state only with id
    } else if (!id && (status==hub.DESTROYED_CLEAN || status==hub.ERROR)) {
      throw K.BAD_STATE_ERROR;
    }
    
    // add dataHash and setup initial status -- also save recordType
    this.writeDataHash(storeKey, (dataHash ? dataHash : {}), K.READY_NEW);
    
    hub.Store.replaceRecordTypeFor(storeKey, recordType);
    this.dataHashDidChange(storeKey);
    
    // Record is now in a committable state -- add storeKey to changelog
    changelog = this.changelog;
    if (!changelog) changelog = hub.Set.create();
    changelog.add(storeKey);
    this.changelog = changelog;
    
    // if commit records is enabled
    if(this.get('commitRecordsAutomatically')){
      var that = this ;
      setTimeout( function() { that.commitRecords(); }, 0) ;
    }
    
    // finally return materialized record
    return this.materializeRecord(storeKey) ;
  },
  
  /**
    Creates an array of new records.  You must pass an array of dataHashes 
    plus a recordType and, optionally, an array of ids.  This will create an
    array of record instances with the same record type.
    
    If you need to instead create a bunch of records with different data types
    you can instead pass an array of recordTypes, one for each data hash.
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} dataHashes array of data hashes
    @param {Array} ids (optional) ids to assign to records
    @returns {Array} array of materialized record instances.
  */
  createRecords: function(recordTypes, dataHashes, ids) {
    var ret = [], recordType, id, isArray, len = dataHashes.length, idx ;
    isArray = hub.typeOf(recordTypes) === hub.T_ARRAY;
    if (!isArray) recordType = recordTypes;
    for(idx=0;idx<len;idx++) {
      if (isArray) recordType = recordTypes[idx] || hub.Record;
      id = ids ? ids[idx] : undefined ;
      ret.push(this.createRecord(recordType, dataHashes[idx], id));
    }
    return ret ;
  },
  
  /**
    Destroys a record, removing the data hash from the store and adding the
    record to the destroyed changelog.  If you try to destroy a record that is 
    already destroyed then this method will have no effect.  If you destroy a 
    record that does not exist or an error then an exception will be raised.
    
    @param {hub.Record} recordType the recordType
    @param {String} id the record id
    @param {Number} storeKey (optional) if passed, ignores recordType and id
    @returns {hub.Store} receiver
  */
  destroyRecord: function(recordType, id, storeKey) {
    if (storeKey === undefined) storeKey = recordType.storeKeyFor(id);
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), changelog, K = hub.Record;
    
    // handle status - ignore if destroying or destroyed
    if ((status === K.BUSY_DESTROYING) || (status & K.DESTROYED)) {
      return this; // nothing to do
      
    // error out if empty
    } else if (status == K.EMPTY) {
      throw K.NOT_FOUND_ERROR ;
      
    // error out if busy
    } else if (status & K.BUSY) {
      throw K.BUSY_ERROR ;
      
    // if new status, destroy but leave in clean state
    } else if (status == K.READY_NEW) {
      status = K.DESTROYED_CLEAN ;
      
    // otherwise, destroy in dirty state
    } else status = K.DESTROYED_DIRTY ;
    
    // remove the data hash, set new status
    this.writeStatus(storeKey, status);
    this.dataHashDidChange(storeKey);
    
    // add/remove change log
    changelog = this.changelog;
    if (!changelog) changelog = this.changelog = hub.Set.create();
    
    ((status & K.DIRTY) ? changelog.add(storeKey) : changelog.remove(storeKey));
    this.changelog=changelog;
    
    // if commit records is enabled
    if(this.get('commitRecordsAutomatically')){
      var that = this ;
      setTimeout( function() { that.commitRecords(); }, 0) ;
    }
    
    return this ;
  },
  
  /**
    Destroys a group of records.  If you have a set of record ids, destroying
    them this way can be faster than retrieving each record and destroying 
    it individually.
    
    You can pass either a single recordType or an array of recordTypes.  If
    you pass a single recordType, then the record type will be used for each
    record.  If you pass an array, then each id must have a matching record 
    type in the array.
    
    You can optionally pass an array of storeKeys instead of the recordType
    and ids.  In this case the first two parameters will be ignored.  This
    is usually only used by low-level internal methods.  You will not usually
    destroy records this way.
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to destroy
    @param {Array} storeKeys (optional) store keys to destroy
    @returns {hub.Store} receiver
  */
  destroyRecords: function(recordTypes, ids, storeKeys) {
    var len, isArray, idx, id, recordType, storeKey;
    if(storeKeys===undefined){
      len = ids.length;
      isArray = hub.typeOf(recordTypes) === hub.T_ARRAY;
      if (!isArray) recordType = recordTypes;
      for(idx=0;idx<len;idx++) {
        if (isArray) recordType = recordTypes[idx] || hub.Record;
        id = ids ? ids[idx] : undefined ;
        this.destroyRecord(recordType, id, undefined);
      }
    }else{
      len = storeKeys.length;
      for(idx=0;idx<len;idx++) {
        storeKey = storeKeys ? storeKeys[idx] : undefined ;
        hub_precondition(typeof storeKey === hub.T_NUMBER);
        this.destroyRecord(undefined, undefined, storeKey);
      }
    }
    return this ;
  },
  
  /**
    Notes that the data for the given record id has changed.  The record will
    be committed to the server the next time you commit the root store.  Only
    call this method on a record in a READY state of some type.
    
    @param {hub.Record} recordType the recordType
    @param {String} id the record id
    @param {Number} storeKey (optional) if passed, ignores recordType and id
    @param {String} key that changed (optional)
    @returns {hub.Store} receiver
  */
  recordDidChange: function(recordType, id, storeKey, key) {
    if (storeKey === undefined) storeKey = recordType.storeKeyFor(id);
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), changelog, K = hub.Record;
    
    // BUSY_LOADING, BUSY_CREATING, BUSY_COMMITTING, BUSY_REFRESH_CLEAN
    // BUSY_REFRESH_DIRTY, BUSY_DESTROYING
    if (status & K.BUSY) {
      throw K.BUSY_ERROR ;
      
    // if record is not in ready state, then it is not found.
    // ERROR, EMPTY, DESTROYED_CLEAN, DESTROYED_DIRTY
    } else if (!(status & K.READY)) {
      throw K.NOT_FOUND_ERROR ;
      
    // otherwise, make new status READY_DIRTY unless new.
    // K.READY_CLEAN, K.READY_DIRTY, ignore K.READY_NEW
    } else {
      if (status != K.READY_NEW) this.writeStatus(storeKey, K.READY_DIRTY);
    }
    
    // record data hash change
    this.dataHashDidChange(storeKey, null, null, key);
    
    // record in changelog
    changelog = this.changelog ;
    if (!changelog) changelog = this.changelog = hub.Set.create() ;
    changelog.add(storeKey);
    this.changelog = changelog;
    
    // if commit records is enabled
    if(this.get('commitRecordsAutomatically')){
      var that = this ;
      setTimeout( function() { that.commitRecords(); }, 0) ;
    }
    
    return this ;
  },
  
  /**
    Mark a group of records as dirty.  The records will be committed to the
    server the next time you commit changes on the root store.  If you have a 
    set of record ids, marking them dirty this way can be faster than 
    retrieving each record and destroying it individually.
    
    You can pass either a single recordType or an array of recordTypes.  If
    you pass a single recordType, then the record type will be used for each
    record.  If you pass an array, then each id must have a matching record 
    type in the array.
    
    You can optionally pass an array of storeKeys instead of the recordType
    and ids.  In this case the first two parameters will be ignored.  This
    is usually only used by low-level internal methods.  
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to destroy
    @param {Array} storeKeys (optional) store keys to destroy
    @returns {hub.Store} receiver
  */
  recordsDidChange: function(recordTypes, ids, storeKeys) {
     var len, isArray, idx, id, recordType, storeKey;
      if(storeKeys===undefined){
        len = ids.length;
        isArray = hub.typeOf(recordTypes) === hub.T_ARRAY;
        if (!isArray) recordType = recordTypes;
        for(idx=0;idx<len;idx++) {
          if (isArray) recordType = recordTypes[idx] || hub.Record;
          id = ids ? ids[idx] : undefined ;
          storeKey = storeKeys ? storeKeys[idx] : undefined ;
          hub_precondition(typeof storeKey === hub.T_NUMBER);
          this.recordDidChange(recordType, id, storeKey);
        }
      }else{
        len = storeKeys.length;
        for(idx=0;idx<len;idx++) {
          storeKey = storeKeys ? storeKeys[idx] : undefined ;
          hub_precondition(typeof storeKey === hub.T_NUMBER);
          this.recordDidChange(undefined, undefined, storeKey);
        }
      }
      return this ;
  },
  
  /**
    Retrieves a set of records from the server.  If the records has 
    already been loaded in the store, then this method will simply return.  
    Otherwise if your store has a dataSource, this will call the 
    dataSource to retrieve the record.  Generally you will not need to 
    call this method yourself. Instead you can just use find().
    
    This will not actually create a record instance but it will initiate a 
    load of the record from the server.  You can subsequently get a record 
    instance itself using materializeRecord()
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to retrieve
    @param {Array} storeKeys (optional) store keys to retrieve
    @param {Boolean} isRefresh
    @returns {Array} storeKeys to be retrieved
  */
  retrieveRecords: function(recordTypes, ids, storeKeys, isRefresh) {
    
    var source  = this._hub_getDataSource(),
        isArray = hub.typeOf(recordTypes) === hub.T_ARRAY,
        len     = (!storeKeys) ? ids.length : storeKeys.length,
        ret     = [],
        rev     = hub.Store.generateStoreKey(),
        K       = hub.Record,
        recordType, idx, storeKey, status, ok;
        
    if (!isArray) recordType = recordTypes;
    
    // if no storeKeys were passed, map recordTypes + ids
    for (idx=0;idx<len;idx++) {
      
      // collect store key
      if (storeKeys) {
        storeKey = storeKeys[idx];
      } else {
        if (isArray) recordType = recordTypes[idx];
        storeKey = recordType.storeKeyFor(ids[idx]);
      }
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      // collect status and process
      status = this.readStatus(storeKey);
      
      // K.EMPTY, K.ERROR, K.DESTROYED_CLEAN - initial retrieval
      if ((status == K.EMPTY) || (status == K.ERROR) || (status == K.DESTROYED_CLEAN)) {
        this.writeStatus(storeKey, K.BUSY_LOADING);
        this.dataHashDidChange(storeKey, rev, true);
        ret.push(storeKey);
        
      // otherwise, ignore record unless isRefresh is true.
      } else if (isRefresh) {
        // K.READY_CLEAN, K.READY_DIRTY, ignore K.READY_NEW
        if (status & K.READY) {
          this.writeStatus(storeKey, K.BUSY_REFRESH | (status & 0x03)) ;
          this.dataHashDidChange(storeKey, rev, true);
          ret.push(storeKey);
          
        // K.BUSY_DESTROYING, K.BUSY_COMMITTING, K.BUSY_CREATING
        } else if ((status == K.BUSY_DESTROYING) || (status == K.BUSY_CREATING) || (status == K.BUSY_COMMITTING)) {
          throw K.BUSY_ERROR ;
          
        // K.DESTROY_DIRTY, bad state...
        } else if (status == K.DESTROYED_DIRTY) {
          throw K.BAD_STATE_ERROR ;
          
        // ignore K.BUSY_LOADING, K.BUSY_REFRESH_CLEAN, K.BUSY_REFRESH_DIRTY
        }
      }
    }
    
    // now retrieve storekeys from dataSource.  if there is no dataSource,
    // then act as if we couldn't retrieve.
    ok = false;
    if (source) ok = source.retrieveRecords.call(source, this, ret, ids);

    // if the data source could not retrieve or if there is no source, then
    // simulate the data source calling dataSourceDidError on those we are 
    // loading for the first time or dataSourceDidComplete on refreshes.
    if (!ok) {
      len = ret.length;
      rev = hub.Store.generateStoreKey();
      for(idx=0;idx<len;idx++) {
        storeKey = ret[idx];
        hub_precondition(typeof storeKey === hub.T_NUMBER);
        status   = this.readStatus(storeKey);
        if (status === K.BUSY_LOADING) {
          this.writeStatus(storeKey, K.ERROR);
          this.dataHashDidChange(storeKey, rev, true);
          
        } else if (status & K.BUSY_REFRESH) {
          this.writeStatus(storeKey, K.READY | (status & 0x03));
          this.dataHashDidChange(storeKey, rev, true);
        }
      }
      ret.length = 0 ; // truncate to indicate that none could refresh
    }
    return ret ;
  },
  
  _hub_TMP_RETRIEVE_ARRAY: [],
  
  /**
    Retrieves a record from the server.  If the record has already been loaded
    in the store, then this method will simply return.  Otherwise if your 
    store has a dataSource, this will call the dataSource to retrieve the 
    record.  Generally you will not need to call this method yourself.  
    Instead you can just use find().
    
    This will not actually create a record instance but it will initiate a 
    load of the record from the server.  You can subsequently get a record 
    instance itself using materializeRecord()
    
    @param {hub.Record} recordType class
    @param {String} id id to retrieve
    @param {Number} storeKey (optional) store key
    @param {Boolean} isRefresh
    @returns {Number} storeKey that was retrieved 
  */
  retrieveRecord: function(recordType, id, storeKey, isRefresh) {
    var array = this._hub_TMP_RETRIEVE_ARRAY,
        ret;
    
    if (storeKey) {
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      array[0] = storeKey;
      storeKey = array;
      id = null ;
    } else {
      array[0] = id;
      id = array;
    }
    
    ret = this.retrieveRecords(recordType, id, storeKey, isRefresh);
    array.length = 0 ;
    return ret[0];
  },
  
  /**
    Refreshes a record from the server.  If the record has already been loaded
    in the store, then this method will request a refresh from the dataSource.
    Otherwise it will attempt to retrieve the record.
    
    @param {String} id to id of the record to load
    @param {hub.Record} recordType the expected record type
    @param {Number} storeKey (optional) optional store key
    @returns {Boolean} true if the retrieval was a success.
  */
  refreshRecord: function(recordType, id, storeKey) {
    return !!this.retrieveRecord(recordType, id, storeKey, true);
  },
  
  /**
    Refreshes a set of records from the server.  If the records has already been loaded
    in the store, then this method will request a refresh from the dataSource.
    Otherwise it will attempt to retrieve them.
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to destroy
    @param {Array} storeKeys (optional) store keys to destroy
    @returns {Boolean} true if the retrieval was a success.
  */
  refreshRecords: function(recordTypes, ids, storeKeys) {
    var ret = this.retrieveRecords(recordTypes, ids, storeKeys, true);
    return ret && ret.length>0;
  },
    
  /**
    Commits the passed store keys or ids. If no storeKeys are given 
    it will commit any records in the changelog. 
    
    Based on the current state of the record, this will ask the data 
    source to perform the appropriate actions
    on the store keys.
    
    @param {Array} recordTypes the expected record types (hub.Record)
    @param {Array} ids to commit
    @param {Array} storeKeys to commit
    @param {Hash} params optional additional parameters to pass along to the
      data source
    
    @returns {Boolean} if the action was succesful.
  */
  commitRecords: function(recordTypes, ids, storeKeys, params) {
    var source    = this._hub_getDataSource(),
        isArray   = hub.typeOf(recordTypes) === hub.T_ARRAY,    
        retCreate= [], retUpdate= [], retDestroy = [], 
        rev       = hub.Store.generateStoreKey(),
        K         = hub.Record,
        recordType, idx, storeKey, status, key, ret, len ;
        
    // If no params are passed, look up storeKeys in the changelog property.
    // Remove any committed records from changelog property.
    if(!recordTypes && !ids && !storeKeys){
      storeKeys = this.changelog;
    }
    
    len = storeKeys ? storeKeys.get('length') : (ids ? ids.get('length') : 0);
    
    for(idx=0;idx<len;idx++) {
      
      // collect store key
      if (storeKeys) {
        storeKey = storeKeys[idx];
      } else {
        if (isArray) recordType = recordTypes[idx] || hub.Record;
        else recordType = recordTypes;
        storeKey = recordType.storeKeyFor(ids[idx]);
      }
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      // collect status and process
      status = this.readStatus(storeKey);
      
      if ((status == K.EMPTY) || (status == K.ERROR)) {
        throw K.NOT_FOUND_ERROR ;
      } 
      else {
        if(status==K.READY_NEW) {
          this.writeStatus(storeKey, K.BUSY_CREATING);
          this.dataHashDidChange(storeKey, rev, true);
          retCreate.push(storeKey);
        } else if (status==K.READY_DIRTY) {
          this.writeStatus(storeKey, K.BUSY_COMMITTING);
          this.dataHashDidChange(storeKey, rev, true);
          retUpdate.push(storeKey);
        } else if (status==K.DESTROYED_DIRTY) {
          this.writeStatus(storeKey, K.BUSY_DESTROYING);
          this.dataHashDidChange(storeKey, rev, true);
          retDestroy.push(storeKey);
        } else if (status==K.DESTROYED_CLEAN) {
          this.dataHashDidChange(storeKey, rev, true);
        }
        // ignore K.READY_CLEAN, K.BUSY_LOADING, K.BUSY_CREATING, K.BUSY_COMMITTING, 
        // K.BUSY_REFRESH_CLEAN, K_BUSY_REFRESH_DIRTY, KBUSY_DESTROYING
      }
    }
    
    // now commit storekeys to dataSource
    if (source && (len>0 || params)) {
      ret = source.commitRecords.call(source, this, retCreate, retUpdate, retDestroy, params);
    }
    
    //remove all commited changes from changelog
    if (ret && !recordTypes && !ids && storeKeys===this.changelog){ 
      this.changelog = null; 
    }
    return ret ;
  },
  
  /**
    Commits the passed store key or id.  Based on the current state of the 
    record, this will ask the data source to perform the appropriate action
    on the store key.
    
    You have to pass either the id or the storeKey otherwise it will return 
    false.
    
    @param {hub.Record} recordType the expected record type
    @param {String} id the id of the record to commit
    @param {Number} storeKey the storeKey of the record to commit
    @param {Hash} params optional additonal params that will passed down
      to the data source
    @returns {Boolean} if the action was successful.
  */
  commitRecord: function(recordType, id, storeKey, params) {
    var array = this._hub_TMP_RETRIEVE_ARRAY,
        ret ;
    if (id === undefined && storeKey === undefined ) return false;
    if (storeKey !== undefined) {
      array[0] = storeKey;
      storeKey = array;
      id = null ;
    } else {
      array[0] = id;
      id = array;
    }
    
    ret = this.commitRecords(recordType, id, storeKey, params);
    array.length = 0 ;
    return ret;
  },
  
  /**
    Cancels an inflight request for the passed records.  Depending on the 
    server implementation, this could cancel an entire request, causing 
    other records to also transition their current state.
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to destroy
    @param {Array} storeKeys (optional) store keys to destroy
    @returns {hub.Store} the store.
  */
  cancelRecords: function(recordTypes, ids, storeKeys) {
    var source  = this._hub_getDataSource(),
        isArray = hub.typeOf(recordTypes) === hub.T_ARRAY,
        K       = hub.Record,
        ret     = [],
        status, len, idx, id, recordType, storeKey;
        
    len = (storeKeys === undefined) ? ids.length : storeKeys.length;
    for(idx=0;idx<len;idx++) {
      if (isArray) recordType = recordTypes[idx] || hub.Record;
      else recordType = recordTypes || hub.Record;
      
      id = ids ? ids[idx] : undefined ;
      
      if(storeKeys===undefined){
        storeKey = recordType.storeKeyFor(id);
      }else{
        storeKey = storeKeys ? storeKeys[idx] : undefined ;
      }
      if(storeKey) {
        hub_precondition(typeof storeKey === hub.T_NUMBER);
        status = this.readStatus(storeKey);
        
        if ((status == K.EMPTY) || (status == K.ERROR)) {
          throw K.NOT_FOUND_ERROR ;
        }
        ret.push(storeKey);
      }
    }
    
    if (source) source.cancel.call(source, this, ret);
    
    return this ;
  },
  
  /**
    Cancels an inflight request for the passed record.  Depending on the 
    server implementation, this could cancel an entire request, causing 
    other records to also transition their current state.
    
    @param {hub.Record|Array} recordTypes class or array of classes
    @param {Array} ids ids to destroy
    @param {Array} storeKeys (optional) store keys to destroy
    @returns {hub.Store} the store.
  */
  cancelRecord: function(recordType, id, storeKey) {
    var array = this._hub_TMP_RETRIEVE_ARRAY,
        ret ;
        
    if (storeKey !== undefined) {
      array[0] = storeKey;
      storeKey = array;
      id = null ;
    } else {
      array[0] = id;
      id = array;
    }
    
    ret = this.cancelRecords(recordType, id, storeKey);
    array.length = 0 ;
    return this;
  },
  
  /** 
    Convenience method can be called by the store or other parts of your 
    application to load records into the store.  This method will take a 
    recordType and an array of data hashes and either add or update the 
    record in the store. 
    
    The loaded records will be in an hub.Record.READY_CLEAN state, indicating 
    they were loaded from the data source and do not need to be committed 
    back before changing.
    
    This method will check the state of each storeKey and call either 
    pushRetrieve() or dataSourceDidComplete().  The standard state constraints 
    for these methods apply here.
    
    The return value will be the storeKeys used for each push.  This is often 
    convenient to pass into loadQuery(), if you are fetching a remote query.
    
    @param {hub.Record} recordTypes the record type or array of record types
    @param {Array} dataHashes array of data hashes to update
    @param {Array} ids optional array of ids.  if not passed lookup on hashes
    @returns {Array} store keys assigned to these ids
  */
  loadRecords: function(recordTypes, dataHashes, ids) {
    var isArray = hub.typeOf(recordTypes) === hub.T_ARRAY,
        len     = dataHashes.get('length'),
        ret     = [],
        K       = hub.Record,
        recordType, id, primaryKey, idx, dataHash, storeKey;
        
    // save lookup info
    if (!isArray) {
      recordType = recordTypes || hub.Record;
      primaryKey = recordType.prototype.primaryKey ;
    }
    
    // push each record
    for(idx=0;idx<len;idx++) {
      dataHash = dataHashes.objectAt(idx);
      if (isArray) {
        recordType = recordTypes.objectAt(idx) || hub.Record;
        primaryKey = recordType.prototype.primaryKey ;
      }
      id = (ids) ? ids.objectAt(idx) : dataHash[primaryKey];
      ret[idx] = storeKey = recordType.storeKeyFor(id); // needed to cache
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      
      if (this.readStatus(storeKey) & K.BUSY) {
        this.dataSourceDidComplete(storeKey, dataHash, id);
      } else this.pushRetrieve(recordType, id, dataHash, storeKey);
    }
    
    // return storeKeys
    return ret ;
  },

  /**
    Returns the hub.Error object associated with a specific record.

    @param {Number} storeKey The store key of the record.
 
    @returns {hub.Error} hub.Error or undefined if no error associated with the record.
  */
  readError: function(storeKey) {
    var errors = this.recordErrors ;
    return errors ? errors[storeKey] : undefined ;
  },

  /**
    Returns the hub.Error object associated with a specific query.

    @param {hub.Query} query The hub.Query with which the error is associated.
 
    @returns {hub.Error} hub.Error or undefined if no error associated with the query.
  */
  readQueryError: function(query) {
    var errors = this.queryErrors ;
    return errors ? errors[hub.guidFor(query)] : undefined ;
  },
  
  // ..........................................................
  // DATA SOURCE CALLBACKS
  // 
  // Mathods called by the data source on the store
  
  /**
    Called by a dataSource when it cancels an inflight operation on a 
    record.  This will transition the record back to it non-inflight state.
    
    @param {Number} storeKey record store key to cancel
    @returns {hub.Store} reciever
  */
  dataSourceDidCancel: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), 
        K      = hub.Record;
    
    // EMPTY, ERROR, READY_CLEAN, READY_NEW, READY_DIRTY, DESTROYED_CLEAN,
    // DESTROYED_DIRTY
    if (!(status & K.BUSY)) {
      throw K.BAD_STATE_ERROR; // should never be called in this state
      
    }
    
    // otherwise, determine proper state transition
    switch(status) {
      case K.BUSY_LOADING:
        status = K.EMPTY;
        break ;
      
      case K.BUSY_CREATING:
        status = K.READY_NEW;
        break;
        
      case K.BUSY_COMMITTING:
        status = K.READY_DIRTY ;
        break;
        
      case K.BUSY_REFRESH_CLEAN:
        status = K.READY_CLEAN;
        break;
        
      case K.BUSY_REFRESH_DIRTY:
        status = K.READY_DIRTY ;
        break ;
        
      case K.BUSY_DESTROYING:
        status = K.DESTROYED_DIRTY ;
        break;
        
      default:
        throw K.BAD_STATE_ERROR ;
    } 
    this.writeStatus(storeKey, status) ;
    this.dataHashDidChange(storeKey, null, true);
    
    return this ;
  },
  
  /**
    Called by a data source when it creates or commits a record.  Passing an
    optional id will remap the storeKey to the new record id.  This is 
    required when you commit a record that does not have an id yet.
    
    @param {Number} storeKey record store key to change to READY_CLEAN state
    @param {Hash} dataHash optional data hash to replace current hash
    @param {Object} newId optional new id to replace the old one
    @returns {hub.Store} reciever
  */
  dataSourceDidComplete: function(storeKey, dataHash, newId) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), K = hub.Record, statusOnly;
    
    // EMPTY, ERROR, READY_CLEAN, READY_NEW, READY_DIRTY, DESTROYED_CLEAN,
    // DESTROYED_DIRTY
    if (!(status & K.BUSY)) {
      throw K.BAD_STATE_ERROR; // should never be called in this state
    }
    
    // otherwise, determine proper state transition
    if(status===K.BUSY_DESTROYING) {
      throw K.BAD_STATE_ERROR ;
    } else status = K.READY_CLEAN ;

    this.writeStatus(storeKey, status) ;
    if (dataHash) this.writeDataHash(storeKey, dataHash, status) ;
    if (newId) hub.Store.replaceIdFor(storeKey, newId);
    
    statusOnly = dataHash || newId ? false : true;
    this.dataHashDidChange(storeKey, null, statusOnly);
    
    return this ;
  },
  
  /**
    Called by a data source when it has destroyed a record.  This will
    transition the record to the proper state.
    
    @param {Number} storeKey record store key to cancel
    @returns {hub.Store} reciever
  */
  dataSourceDidDestroy: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), K = hub.Record;
    
    // EMPTY, ERROR, READY_CLEAN, READY_NEW, READY_DIRTY, DESTROYED_CLEAN,
    // DESTROYED_DIRTY
    if (!(status & K.BUSY)) {
      throw K.BAD_STATE_ERROR; // should never be called in this state
    }
    // otherwise, determine proper state transition
    else{
      status = K.DESTROYED_CLEAN ;
    } 
    this.removeDataHash(storeKey, status) ;
    this.dataHashDidChange(storeKey);
    
    return this ;
  },
  
  /**
    Converts the passed record into an error object.
    
    @param {Number} storeKey record store key to error
    @param {hub.Error} error [optional] an hub.Error instance to associate with storeKey
    @returns {hub.Store} reciever
  */
  dataSourceDidError: function(storeKey, error) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var status = this.readStatus(storeKey), errors = this.recordErrors, K = hub.Record;
    
    // EMPTY, ERROR, READY_CLEAN, READY_NEW, READY_DIRTY, DESTROYED_CLEAN,
    // DESTROYED_DIRTY
    if (!(status & K.BUSY)) throw K.BAD_STATE_ERROR; 

    // otherwise, determine proper state transition
    else status = K.ERROR ;

    // Add the error to the array of record errors (for lookup later on if necessary).
    if (error && error.isError) {
      if (!errors) errors = this.recordErrors = [];
      errors[storeKey] = error;
    }

    this.writeStatus(storeKey, status) ;
    this.dataHashDidChange(storeKey, null, true);
    
    return this ;
  },
  
  // ..........................................................
  // PUSH CHANGES FROM DATA SOURCE
  // 
  
  /**
    Call by the data source whenever you want to push new data out of band 
    into the store.
    
    @param {Class} recordType the hub.Record subclass
    @param {Object} id the record id or null
    @param {Hash} dataHash data hash to load
    @param {Number} storeKey optional store key.  
    @returns {Boolean} true if push was allowed
  */
  pushRetrieve: function(recordType, id, dataHash, storeKey) {
    var K = hub.Record, status ;
    
    if (storeKey===undefined) storeKey = recordType.storeKeyFor(id) ;
    hub_assert(typeof storeKey === hub.T_NUMBER) ;
    
    status = this.readStatus(storeKey) ;
    if (status==K.EMPTY || status==K.ERROR || status==K.READY_CLEAN || status==K.DESTROYED_CLEAN || status==K.BUSY_LOADING) {
      status = K.READY_CLEAN ;
      
      if (dataHash===undefined) this.writeStatus(storeKey, status) ;
      else this.writeDataHash(storeKey, dataHash, status) ;
      
      this.dataHashDidChange(storeKey) ;
      return true ;
    } else {
      // A conflict occurred.
      return false ;
    }
  },
  
  /**
    Call by the data source whenever you want to push a deletion into the 
    store.
    
    @param {Class} recordType the hub.Record subclass
    @param {Object} id the record id or null
    @param {Number} storeKey optional store key.  
    @returns {Boolean} true if push was allowed
  */
  pushDestroy: function(recordType, id, storeKey) {
    var K = hub.Record, status ;
    
    if (storeKey===undefined) storeKey = recordType.storeKeyFor(id) ;
    hub_assert(typeof storeKey === hub.T_NUMBER) ;
    
    status = this.readStatus(storeKey) ;
    if (status==K.EMPTY || status==K.ERROR || status==K.READY_CLEAN || status==K.DESTROYED_CLEAN) {
      // status = K.DESTROYED_CLEAN ;
      
      this.removeDataHash(storeKey, K.DESTROYED_CLEAN) ;
      this.dataHashDidChange(storeKey) ;
      return true;
    } else {
      // A conflict occurred.
      return false ;
    }
  },
  
  /**
    Call by the data source whenever you want to push an error into the 
    store.
    
    @param {Class} recordType the hub.Record subclass
    @param {Object} id the record id or null
    @param {hub.Error} error [optional] an hub.Error instance to associate with id or storeKey
    @param {Number} storeKey optional store key.
    @returns {Boolean} true if push was allowed
  */
  pushError: function(recordType, id, error, storeKey) {
    var K = hub.Record, status, errors = this.recordErrors ;
    
    if (storeKey===undefined) storeKey = recordType.storeKeyFor(id) ;
    hub_assert(typeof storeKey === hub.T_NUMBER) ;
    
    status = this.readStatus(storeKey) ;
    if (status==K.EMPTY || status==K.ERROR || status==K.READY_CLEAN || status==K.DESTROYED_CLEAN) {
      // status = K.ERROR ;
      
      // Add the error to the array of record errors (for lookup later on if 
      // necessary).
      if (error && error.isError) {
        if (!errors) errors = this.recordErrors = [] ;
        errors[storeKey] = error;
      }
      
      this.writeStatus(storeKey, K.ERROR) ;
      this.dataHashDidChange(storeKey, null, true) ;
      return true ;
    } else {
      // A conflict occurred.
      return false ;
    }
  },
  
  // ..........................................................
  // FETCH CALLBACKS
  // 
  
  // NOTE: although these method works on RecordArray instances right now.
  // They could be optimized to actually share query results between nested
  // stores.  This is why these methods are implemented here instead of 
  // directly on Query or RecordArray objects.
  
  /**
    Sets the passed array of storeKeys as the new data for the query.  You
    can call this at any time for a remote query to update its content.  If
    you want to use incremental loading, then pass a SparseArray object.
    
    If the query you pass is not a REMOTE query, then this method will raise
    an exception.  This will also implicitly transition the query state to 
    hub.Record.READY.
    
    If you called loadRecords() before to load the actual content, you can
    call this method with the return value of that method to actually set the
    storeKeys on the result.
    
    @param {hub.Query} query the query you are loading.  must be remote.
    @param {hub.Array} storeKeys array of store keys
    @returns {hub.Store} receiver
  */
  loadQueryResults: function(query, storeKeys) {
    if (query.get('location') === hub.Query.LOCAL) {
      throw new Error("Cannot load query results for a local query");
    }

    var recArray = this._hub_findQuery(query, true, false);
    if (recArray) recArray.set('storeKeys', storeKeys);
    this.dataSourceDidFetchQuery(query);
    
    return this ;
  },
  
  /**
    Called by your data source whenever you finish fetching the results of a 
    query.  This will put the query into a READY state if it was loading.
    
    Note that if the query is a REMOTE query, then you must separately load 
    the results into the query using loadQuery().  If the query is LOCAL, then
    the query will update automatically with any new records you added to the
    store.
    
    @param {hub.Query} query the query you fetched
    @returns {hub.Store} receiver
  */
  dataSourceDidFetchQuery: function(query) {
    // FIXME: Rename _hub_scstore_dataSourceDidFetchQuery
    return this._hub_scstore_dataSourceDidFetchQuery(query, true);
  },
  
  _hub_scstore_dataSourceDidFetchQuery: function(query, createIfNeeded) {
    var recArray     = this._hub_findQuery(query, createIfNeeded, false),
        nestedStores = this.get('nestedStores'),
        loc          = nestedStores ? nestedStores.get('length') : 0;
    
    // fix query if needed
    if (recArray) recArray.storeDidFetchQuery(query);
    
    // notify nested stores
    while(--loc >= 0) {
      nestedStores[loc]._hub_scstore_dataSourceDidFetchQuery(query, false);
    }
    
    return this ;
  },
  
  /**
    Called by your data source if it cancels fetching the results of a query.
    This will put any RecordArray's back into its original state (READY or
    EMPTY).
    
    @param {hub.Query} query the query you cancelled
    @returns {hub.Store} receiver
  */
  dataSourceDidCancelQuery: function(query) {
    // FIXME: Rename _hub_scstore_dataSourceDidCancelQuery
    return this._hub_scstore_dataSourceDidCancelQuery(query, true);
  },
  
  _hub_scstore_dataSourceDidCancelQuery: function(query, createIfNeeded) {
    var recArray     = this._hub_findQuery(query, createIfNeeded, false),
        nestedStores = this.get('nestedStores'),
        loc          = nestedStores ? nestedStores.get('length') : 0;
    
    // fix query if needed
    if (recArray) recArray.storeDidCancelQuery(query);
    
    // notify nested stores
    while(--loc >= 0) {
      nestedStores[loc]._hub_scstore_dataSourceDidCancelQuery(query, false);
    }
    
    return this ;
  },
  
  /**
    Called by your data source if it encountered an error loading the query.
    This will put the query into an error state until you try to refresh it
    again.
    
    @param {hub.Query} query the query with the error
    @param {hub.Error} error [optional] an hub.Error instance to associate with query
    @returns {hub.Store} receiver
  */
  dataSourceDidErrorQuery: function(query, error) {
    var errors = this.queryErrors;

    // Add the error to the array of query errors (for lookup later on if necessary).
    if (error && error.isError) {
      if (!errors) errors = this.queryErrors = {};
      errors[hub.guidFor(query)] = error;
    }

    return this._hub_scstore_dataSourceDidErrorQuery(query, true);
  },

  _hub_scstore_dataSourceDidErrorQuery: function(query, createIfNeeded) {
    var recArray     = this._hub_findQuery(query, createIfNeeded, false),
        nestedStores = this.get('nestedStores'),
        loc          = nestedStores ? nestedStores.get('length') : 0;

    // fix query if needed
    if (recArray) recArray.storeDidErrorQuery(query);

    // notify nested stores
    while(--loc >= 0) {
      nestedStores[loc]._hub_scstore_dataSourceDidErrorQuery(query, false);
    }

    return this ;
  },
    
  // ..........................................................
  // INTERNAL SUPPORT
  // 
  
  /** @private */
  init: function() {
    arguments.callee.base.apply(this, arguments) ;
    this.reset() ;
  },
  
  
  toString: function() {
    // Include the name if the client has specified one.
    var name = this.get('name');
    if (!name) {
      return arguments.callee.base.apply(this, arguments) ;
    }
    else {
      var ret = arguments.callee.base.apply(this, arguments) ;
      return hub.fmt("%@ (%@)", name, ret);
    }
  },


  // ..........................................................
  // PRIMARY KEY CONVENIENCE METHODS
  // 
  
  /** 
    Given a storeKey, return the primaryKey.
    
    @param {Number} storeKey the store key
    @returns {String} primaryKey value
  */
  idFor: function(storeKey) {
    return hub.Store.idFor(storeKey);
  },
  
  /**
    Given a storeKey, return the recordType.
    
    @param {Number} storeKey the store key
    @returns {hub.Record} record instance
  */
  recordTypeFor: function(storeKey) {
    return hub.Store.recordTypeFor(storeKey) ;
  },
  
  /**
    Given a recordType and primaryKey, find the storeKey. If the primaryKey 
    has not been assigned a storeKey yet, it will be added.
    
    @param {hub.Record} recordType the record type
    @param {String} primaryKey the primary key
    @returns {Number} storeKey
  */
  storeKeyFor: function(recordType, primaryKey) {
    return recordType.storeKeyFor(primaryKey);
  },
  
  /**
    Given a primaryKey value for the record, returns the associated
    storeKey.  As opposed to storeKeyFor() however, this method
    will NOT generate a new storeKey but returned undefined.
    
    @param {String} id a record id
    @returns {Number} a storeKey.
  */
  storeKeyExists: function(recordType, primaryKey) {
    return recordType.storeKeyExists(primaryKey);
  },
  
  /**
    Finds all storeKeys of a certain record type in this store
    and returns an array.
    
    @param {hub.Record} recordType
    @returns {Array} set of storeKeys
  */
  storeKeysFor: function(recordType) {
    var ret = [], 
        isEnum = recordType && recordType.isEnumerable,
        recType, storeKey, isMatch ;
    
    if (!this.statuses) return ret;
    for(storeKey in hub.Store.recordTypesByStoreKey) {
      recType = hub.Store.recordTypesByStoreKey[storeKey];
      
      // if same record type and this store has it
      if (isEnum) isMatch = recordType.contains(recType);
      else isMatch = recType === recordType;
      
      if(isMatch && this.statuses[storeKey]) ret.push(parseInt(storeKey, 0));
    }
    
    return ret;
  },
  
  /**
    Finds all storeKeys in this store
    and returns an array.
    
    @returns {Array} set of storeKeys
  */
  storeKeys: function() {
    var ret = [], storeKey;
    if(!this.statuses) return;
    
    var K = hub.Record.EMPTY ;
    for(storeKey in this.statuses) {
      // if status is not empty
      if(this.statuses[storeKey] !== K) {
        ret.push(parseInt(storeKey,0));
      }
    }
    
    return ret;
  },
  
  /**
    Returns string representation of a storeKey, with status.
    
    @param {Number} storeKey
    @returns {String}
  */
  statusString: function(storeKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var rec = this.materializeRecord(storeKey);
    return rec.statusString();
  },
  
  query: function(hash) {
    return this.find(hub.Query.create(hash)) ;
  }
  
});

hub.Store.mixin({
  
  /**
    Standard error raised if you try to commit changes from a nested store
    and there is a conflict.
    
    @property {Error}
  */
  CHAIN_CONFLICT_ERROR: new Error("Nested Store Conflict"),
  
  /**
    Standard error if you try to perform an operation on a nested store 
    without a parent.
  
    @property {Error}
  */
  NO_PARENT_STORE_ERROR: new Error("Parent Store Required"),
  
  /**
    Standard error if you try to perform an operation on a nested store that
    is only supported in root stores.
    
    @property {Error}
  */
  NESTED_STORE_UNSUPPORTED_ERROR: new Error("Unsupported In Nested Store"),
  
  /**
    Standard error if you try to retrieve a record in a nested store that is
    dirty.  (This is allowed on the main store, but not in nested stores.)
    
    @property {Error}
  */
  NESTED_STORE_RETRIEVE_DIRTY_ERROR: new Error("Cannot Retrieve Dirty Record in Nested Store"),

  /**
    Data hash state indicates the data hash is currently editable
    
    @property {String}
  */
  EDITABLE:  'editable',
  
  /**
    Data hash state indicates the hash no longer tracks changes from a 
    parent store, but it is not editable.
    
    @property {String}
  */
  LOCKED:    'locked',
  
  /**
    Data hash state indicates the hash is tracking changes from the parent
    store and is not editable.
    
    @property {String}
  */
  INHERITED: 'inherited',
  
  /** @private
    This array maps all storeKeys to primary keys.  You will not normally
    access this method directly.  Instead use the idFor() and 
    storeKeyFor() methods on hub.Record.
  */
  idsByStoreKey: [],
  
  /** @private
    Maps all storeKeys to a recordType.  Once a storeKey is associated with 
    a primaryKey and recordType that remains constant throughout the lifetime
    of the application.
  */
  recordTypesByStoreKey: {},
  
  /** @private
    Maps some storeKeys to query instance.  Once a storeKey is associated with
    a query instance, that remains constant through the lifetime of the 
    application.  If a Query is destroyed, it will remove itself from this 
    list.
    
    Don't access this directly.  Use queryFor().
  */
  queriesByStoreKey: [],
  
  /** @private
    The next store key to allocate.  A storeKey must always be greater than 0
  */
  nextStoreKey: 1,
  
  /**
    Generates a new store key for use.
    
    @property {Number}
  */
  generateStoreKey: function() { return this.nextStoreKey++; },
  
  /** 
    Given a storeKey returns the primaryKey associated with the key.
    If not primaryKey is associated with the storeKey, returns null.
    
    @param {Number} storeKey the store key
    @returns {String} the primary key or null
  */
  idFor: function(storeKey) {
    return this.idsByStoreKey[storeKey] ;
  },
  
  /**
    Given a storeKey, returns the query object associated with the key.  If
    no query is associated with the storeKey, returns null.
    
    @param {Number} storeKey the store key
    @returns {hub.Query} query query object
  */
  queryFor: function(storeKey) {
    return this.queriesByStoreKey[storeKey];  
  },
  
  /**
    Given a storeKey returns the hub.Record class associated with the key.
    If no record type is associated with the store key, returns null.
    
    The hub.Record class will only be found if you have already called
    storeKeyFor() on the record.
    
    @param {Number} storeKey the store key
    @returns {hub.Record} the record type
  */
  recordTypeFor: function(storeKey) {
    return this.recordTypesByStoreKey[storeKey];
  },
  
  /**
    Swaps the primaryKey mapped to the given storeKey with the new 
    primaryKey.  If the storeKey is not currently associated with a record
    this will raise an exception.
    
    @param {Number} storeKey the existing store key
    @param {String} newPrimaryKey the new primary key
    @returns {hub.Store} receiver
  */
  replaceIdFor: function(storeKey, newId) {
    var oldId = this.idsByStoreKey[storeKey],
        recordType, storeKeys;
        
    if (oldId !== newId) { // skip if id isn't changing

      recordType = this.recordTypeFor(storeKey);
       if (!recordType) {
        throw new Error("replaceIdFor: storeKey %@ does not exist".fmt(storeKey));
      }

      // map one direction...
      this.idsByStoreKey[storeKey] = newId; 

      // then the other...
      storeKeys = recordType.storeKeysById() ;
      delete storeKeys[oldId];
      storeKeys[newId] = storeKey;     
    }
    
    return this ;
  },
  
  /**
    Swaps the recordType recorded for a given storeKey.  Normally you should
    not call this method directly as it can damage the store behavior.  This
    method is used by other store methods to set the recordType for a 
    storeKey.
    
    @param {Integer} storeKey the store key
    @param {hub.Record} recordType a record class
    @returns {hub.Store} reciever
  */
  replaceRecordTypeFor: function(storeKey, recordType) {
    this.recordTypesByStoreKey[storeKey] = recordType;
    return this ;
  }
  
});

/** @private */
hub.Store.prototype.nextStoreIndex = 1;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  A nested stores can buffer changes to a parent store and then commit them
  all at once.  You usually will use a NestedStore as part of store chaining
  to stage changes to your object graph before sharing them with the rest of
  the application.
  
  Normally you will not create a nested store directly.  Instead, you can 
  retrieve a nested store by using the chain() method.  When you are finished
  working with the nested store, destroy() will dispose of it.
  
  @mixin
*/
hub.ChildStore = {

  /**
    Walk like a duck.
    
    @readOnly
    @property {Boolean}
  */
  isChildStore: true,
  
  /**
    This is set to true when there are changes that have not been committed 
    yet.

    @property {Boolean}
    @default false
  */
  hasChanges: false,

  /**
    The parent store this nested store is chained to.  Nested stores must have
    a parent store in order to function properly.  Normally, you create a 
    nested store using the hub.Store#chain() method and this property will be
    set for you.
    
    @property {hub.Store}
  */
  parentStore: null,

  /**
    true if the view is nested. Walk like a duck.
    
    FIXME: Remove eventually in favor of isChildStore.
    
    @property {Boolean}
  */
  isNested: true,

  /**
    If true, then the attribute hash state will be locked when you first 
    read the data hash or status.  This means that if you retrieve a record
    then change the record in the parent store, the changes will not be 
    visible to your nested store until you commit or discard changes.
    
    If false, then the attribute hash will lock only when you write data.
    
    Normally you want to lock your attribute hash the first time you read it.
    This will make your nested store behave most consistently.  However, if
    you are using multiple sibling nested stores at one time, you may want
    to turn off this property so that changes from one store will be reflected
    in the other one immediately.  In this case you will be responsible for
    ensuring that the sibling stores do not edit the same part of the object
    graph at the same time.
    
    @property {Boolean} 
  */
  lockOnRead: true,

  /** @private
    Array contains the base revision for an attribute hash when it was first
    cloned from the parent store.  If the attribute hash is edited and 
    commited, the commit will fail if the parent attributes hash has been 
    edited since.
    
    This is a form of optimistic locking, hence the name.
    
    Each store gets its own array of locks, which are selectively populated
    as needed.
    
    Note that this is kept as an array because it will be stored as a dense 
    array on some browsers, making it faster.
    
    @property {Array}
  */
  locks: null,

  /** @private
    An array that includes the store keys that have changed since the store
    was last committed.  This array is used to sync data hash changes between
    chained stores.  For a log changes that may actually be committed back to
    the server see the changelog property.
    
    @property {Array}
  */
  chainedChanges: null,
    
  // ..........................................................
  // STORE CHAINING
  // 
  
  /**
    find() cannot accept REMOTE queries in a nested store.  This override will
    verify that condition for you.  See hub.Store#find() for info on using this
    method.
    
    @returns {hub.Record|hub.RecordArray}
  */
  find: function(query) {
    if (query && query.isQuery && query.get('location') !== hub.Query.LOCAL) {
      throw "hub.Store#find() can only accept LOCAL queries in nested stores";
    }
    return arguments.callee.base.apply(this, arguments) ;
  },
  
  /**
    Propagate this store's changes to its parent.  If the store does not 
    have a parent, this has no effect other than to clear the change set.

    @param {Boolean} force if true, does not check for conflicts first
    @returns {hub.Store} receiver
  */
  commitChanges: function(force) {
    if (this.get('hasChanges')) {
      var pstore = this.get('parentStore');
      pstore.commitChangesFromNestedStore(this, this.chainedChanges, force);
    }

    // clear out custom changes - even if there is nothing to commit.
    this.reset();
    return this ;
  },

  /**
    Discard the changes made to this store and reset the store.
    
    @returns {hub.Store} receiver
  */
  discardChanges: function() {
    
    // any locked records whose rev or lock rev differs from parent need to
    // be notified.
    var records, locks;
    if ((records = this.records) && (locks = this.locks)) {
      var pstore = this.get('parentStore'), psRevisions = pstore.revisions;
      var revisions = this.revisions, storeKey, lock, rev;
      for(storeKey in records) {
        if (!records.hasOwnProperty(storeKey)) continue ;
        if (!(lock = locks[storeKey])) continue; // not locked.

        rev = psRevisions[storeKey];
        if ((rev !== lock) || (revisions[storeKey] > rev)) {
          this._hub_notifyRecordPropertyChange(storeKey);
        }
      }
    }
    
    this.reset();
    this.flush();
    return this ;
  },
  
  /**
    When you are finished working with a chained store, call this method to 
    tear it down.  This will also discard any pending changes.
    
    @returns {hub.Store} receiver
  */
  destroy: function() {
    this.discardChanges();
    
    var parentStore = this.get('parentStore');
    if (parentStore) parentStore.willDestroyNestedStore(this);
    
    arguments.callee.base.apply(this, arguments) ;
    return this ;
  },

  /**
    Resets a store's data hash contents to match its parent.
    
    @returns {hub.Store} receiver
  */
  reset: function() {

    // requires a pstore to reset
    var parentStore = this.get('parentStore');
    if (!parentStore) throw hub.Store.NO_PARENT_STORE_ERROR;
    
    // inherit data store from parent store.
    this.dataHashes = hub.beget(parentStore.dataHashes);
    this.revisions  = hub.beget(parentStore.revisions);
    this.statuses   = hub.beget(parentStore.statuses);
    
    // also, reset private temporary objects
    this.chainedChanges = this.locks = this.editables = null;
    this.changelog = null ;

    // TODO: Notify record instances
    
    this.set('hasChanges', false);
  },
  
  /** @private
  
    Chain to parentstore
  */
  refreshQuery: function(query) {
    var parentStore = this.get('parentStore');
    if (parentStore) parentStore.refreshQuery(query);
    return this ;      
  },

  /**
    Returns the hub.Error object associated with a specific record.

    Delegates the call to the parent store.

    @param {Number} storeKey The store key of the record.
 
    @returns {hub.Error} hub.Error or null if no error associated with the record.
  */
  readError: function(storeKey) {
    var parentStore = this.get('parentStore');
    return parentStore ? parentStore.readError(storeKey) : null;
  },

  /**
    Returns the hub.Error object associated with a specific query.

    Delegates the call to the parent store.

    @param {hub.Query} query The hub.Query with which the error is associated.
 
    @returns {hub.Error} hub.Error or null if no error associated with the query.
  */
  readQueryError: function(query) {
    var parentStore = this.get('parentStore');
    return parentStore ? parentStore.readQueryError(query) : null;
  },
  
  // ..........................................................
  // CORE ATTRIBUTE API
  // 
  // The methods in this layer work on data hashes in the store.  They do not
  // perform any changes that can impact records.  Usually you will not need 
  // to use these methods.
  
  /**
    Returns the current edit status of a storekey.  May be one of INHERITED,
    EDITABLE, and LOCKED.  Used mostly for unit testing.
    
    @param {Number} storeKey the store key
    @returns {Number} edit status
  */
  storeKeyEditState: function(storeKey) {
    var editables = this.editables, locks = this.locks;
    return (editables && editables[storeKey]) ? hub.Store.EDITABLE : (locks && locks[storeKey]) ? hub.Store.LOCKED : hub.Store.INHERITED ;
  },
   
  /**  @private
    Locks the data hash so that it iterates independently from the parent 
    store.
  */
  _hub_lock: function(storeKey) {
    var locks = this.locks, rev, editables;
    
    // already locked -- nothing to do
    if (locks && locks[storeKey]) return this;

    // create locks if needed
    if (!locks) locks = this.locks = [];

    // fixup editables
    editables = this.editables;
    if (editables) editables[storeKey] = 0;
    
    
    // if the data hash in the parent store is editable, then clone the hash
    // for our own use.  Otherwise, just copy a reference to the data hash
    // in the parent store. -- find first non-inherited state
    var pstore = this.get('parentStore'), editState;
    while(pstore && (editState=pstore.storeKeyEditState(storeKey)) === hub.Store.INHERITED) {
      pstore = pstore.get('parentStore');
    }
    
    if (pstore && editState === hub.Store.EDITABLE) {
      this.dataHashes[storeKey] = hub.clone(pstore.dataHashes[storeKey]);
      if (!editables) editables = this.editables = [];
      editables[storeKey] = 1 ; // mark as editable
      
    } else this.dataHashes[storeKey] = this.dataHashes[storeKey];
    
    // also copy the status + revision
    this.statuses[storeKey] = this.statuses[storeKey];
    rev = this.revisions[storeKey] = this.revisions[storeKey];
    
    // save a lock and make it not editable
    locks[storeKey] = rev || 1;    
    
    return this ;
  },
  
  /** @private - adds chaining support */
  readDataHash: function(storeKey) {
    if (this.get('lockOnRead')) this._hub_lock(storeKey);
    return this.dataHashes[storeKey];
  },
  
  /** @private - adds chaining support */
  readEditableDataHash: function(storeKey) {

    // lock the data hash if needed
    this._hub_lock(storeKey);
    
    return arguments.callee.base.apply(this, arguments) ;
  },
  
  /** @private - adds chaining support - 
    Does not call arguments.callee.base.apply(this, arguments) because the 
    implementation of the methods vary too much.
  */
  writeDataHash: function(storeKey, hash, status) {
    var locks = this.locks, rev ;
    
    // update dataHashes and optionally status.  Note that if status is not
    // passed, we want to copy the reference to the status anyway to lock it
    // in.
    if (hash) this.dataHashes[storeKey] = hash;
    this.statuses[storeKey] = status ? status : (this.statuses[storeKey] || hub.Record.READY_NEW);
    rev = this.revisions[storeKey] = this.revisions[storeKey]; // copy ref
    
    // make sure we lock if needed.
    if (!locks) locks = this.locks = [];
    if (!locks[storeKey]) locks[storeKey] = rev || 1;
    
    // also note that this hash is now editable
    var editables = this.editables;
    if (!editables) editables = this.editables = [];
    editables[storeKey] = 1 ; // use number for dense array support
    
    return this ;
  },

  /** @private - adds chaining support */
  removeDataHash: function(storeKey, status) {
    
    // record optimistic lock revision
    var locks = this.locks;
    if (!locks) locks = this.locks = [];
    if (!locks[storeKey]) locks[storeKey] = this.revisions[storeKey] || 1;

    return arguments.callee.base.apply(this, arguments) ;
  },
  
  /** @private - book-keeping for a single data hash. */
  dataHashDidChange: function(storeKeys, rev, statusOnly, key) {
    
    // update the revision for storeKey.  Use generateStoreKey() because that
    // gaurantees a universally (to this store hierarchy anyway) unique 
    // key value.
    if (!rev) rev = hub.Store.generateStoreKey();
    var isArray, len, idx, storeKey;
    
    isArray = hub.typeOf(storeKeys) === hub.T_ARRAY;
    if (isArray) {
      len = storeKeys.length;
    } else {
      len = 1;
      storeKey = storeKeys;
    }

    var changes = this.chainedChanges;
    if (!changes) changes = this.chainedChanges = hub.Set.create();
    
    for(idx=0;idx<len;idx++) {
      if (isArray) storeKey = storeKeys[idx];
      this._hub_lock(storeKey);
      this.revisions[storeKey] = rev;
      changes.add(storeKey);
      this._hub_notifyRecordPropertyChange(storeKey, statusOnly, key);
    }

    this.setIfChanged('hasChanges', true);
    return this ;
  },

  // ..........................................................
  // SYNCING CHANGES
  // 
  
  /** @private - adapt for nested store */
  commitChangesFromNestedStore: function(nestedStore, changes, force) {
    arguments.callee.base.apply(this, arguments) ;
    
    // save a lock for each store key if it does not have one already
    // also add each storeKey to my own changes set.
    var pstore = this.get('parentStore'), psRevisions = pstore.revisions, i;
    var myLocks = this.locks, myChanges = this.chainedChanges,len,storeKey;
    if (!myLocks) myLocks = this.locks = [];
    if (!myChanges) myChanges = this.chainedChanges = hub.Set.create();

    len = changes.length ;
    for(i=0;i<len;i++) {
      storeKey = changes[i];
      if (!myLocks[storeKey]) myLocks[storeKey] = psRevisions[storeKey]||1;
      myChanges.add(storeKey);
    }
    
    // Finally, mark store as dirty if we have changes
    this.setIfChanged('hasChanges', myChanges.get('length')>0);
    this.flush();
    
    return this ;
  },
  
  // ..........................................................
  // HIGH-LEVEL RECORD API
  // 
  
  /** @private - adapt for nested store */
  queryFor: function(recordType, conditions, params) {
    return this.get('parentStore').queryFor(recordType, conditions, params);
  },
  
  // ..........................................................
  // CORE RECORDS API
  // 
  // The methods in this section can be used to manipulate records without 
  // actually creating record instances.
  
  /** @private - adapt for nested store
  
    Unlike for the main store, for nested stores if isRefresh=true, we'll throw
    an error if the record is dirty.  We'll otherwise avoid setting our status
    because that can disconnect us from upper and/or lower stores.
  */
  retrieveRecords: function(recordTypes, ids, storeKeys, isRefresh) {
    var pstore = this.get('parentStore'), idx, storeKey, newStatus,
      len = (!storeKeys) ? ids.length : storeKeys.length,
      K = hub.Record, status;

    // Is this a refresh?
    if (isRefresh) {
      for(idx=0;idx<len;idx++) {
        storeKey = !storeKeys ? pstore.storeKeyFor(recordTypes, ids[idx]) : storeKeys[idx];
        status   = this.peekStatus(storeKey);
        
        // We won't allow calling retrieve on a dirty record in a nested store
        // (although we do allow it in the main store).  This is because doing
        // so would involve writing a unique status, and that would break the
        // status hierarchy, so even though lower stores would complete the
        // retrieval, the upper layers would never inherit the new statuses.
        if (status & K.DIRTY) {
          throw hub.Store.NESTED_STORE_RETRIEVE_DIRTY_ERROR;
        }
        else {
          // Not dirty?  Then abandon any status we had set (to re-establish
          // any prototype linkage breakage) before asking our parent store to
          // perform the retrieve.
          var dataHashes = this.dataHashes,
              revisions  = this.revisions,
              statuses   = this.statuses,
              editables  = this.editables,
              locks      = this.locks;

          var changed    = false;
          var statusOnly = false;
  
          if (dataHashes  &&  dataHashes.hasOwnProperty(storeKey)) {
            delete dataHashes[storeKey];
            changed = true;
          }
          if (revisions   &&  revisions.hasOwnProperty(storeKey)) {
            delete revisions[storeKey];
            changed = true;
          }
          if (editables) delete editables[storeKey];
          if (locks) delete locks[storeKey];

          if (statuses  &&  statuses.hasOwnProperty(storeKey)) {
            delete statuses[storeKey];
            if (!changed) statusOnly = true;
            changed = true;
          }
          
          if (changed) this._hub_notifyRecordPropertyChange(storeKey, statusOnly);
        }
      }
    }
    
    return pstore.retrieveRecords(recordTypes, ids, storeKeys, isRefresh);
  },

  /** @private - adapt for nested store */
  commitRecords: function(recordTypes, ids, storeKeys) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },

  /** @private - adapt for nested store */
  commitRecord: function(recordType, id, storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },
  
  /** @private - adapt for nested store */
  cancelRecords: function(recordTypes, ids, storeKeys) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },

  /** @private - adapt for nested store */
  cancelRecord: function(recordType, id, storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },
  
  // ..........................................................
  // DATA SOURCE CALLBACKS
  // 
  // Mathods called by the data source on the store

  /** @private - adapt for nested store */
  dataSourceDidCancel: function(storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },
  
  /** @private - adapt for nested store */
  dataSourceDidComplete: function(storeKey, dataHash, newId) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },
  
  /** @private - adapt for nested store */
  dataSourceDidDestroy: function(storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },

  /** @private - adapt for nested store */
  dataSourceDidError: function(storeKey, error) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },

  // ..........................................................
  // PUSH CHANGES FROM DATA SOURCE
  // 
  
  /** @private - adapt for nested store */
  pushRetrieve: function(recordType, id, dataHash, storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },
  
  /** @private - adapt for nested store */
  pushDestroy: function(recordType, id, storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  },

  /** @private - adapt for nested store */
  pushError: function(recordType, id, error, storeKey) {
    throw hub.Store.NESTED_STORE_UNSUPPORTED_ERROR;
  }
};// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  An subclass of hub.Store implementing the hub.ChildStore functionality.
  
  @class
  @extends hub.Store
  @extends hub.ChildStore
*/
hub.EditingContext = hub.Store.extend(hub.ChildStore,
  /** @scope hub.EditingContext.prototype */ {
  
  // all of the common code is in the hub.ChildStore mixin
  
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  With hub.Query, you can perform queries on a hub.Store written in a SQL-like 
  language. Here is a simple example:
    
  {{{
    q = hub.Query.create({
      conditions: "firstName = 'Jonny' AND lastName = 'Cash'"
    });
  }}}
    
  You can check if a certain record matches the query by calling:

  {{{
    q.contains(record) ;
  }}}
  
  To find all records of your store, that match query q, use findAll with
  query q as argument:
  
  {{{
    r = MyApp.store.findAll(q) ;
  }}}
  
  r will be a record array containing all matching records.
  To limit the query to a record type of MyApp.MyModel,
  you can specify the type as a property of the query like this:
  
  {{{
    q = hub.Query.create({ 
      conditions: "firstName = 'Jonny' AND lastName = 'Cash'",
      recordType: MyApp.MyModel 
    });
  }}}
  
  Calling find() like above will now return only records of type t.
  It is recommended to limit your query to a record type, since the query will
  have to look for matching records in the whole store, if no record type
  is given.
  
  You can give an order, which the resulting records should follow, like this:
  
  {{{
    q = hub.Query.create({ 
      conditions: "firstName = 'Jonny' AND lastName = 'Cash'",
      recordType: MyApp.MyModel,
      orderBy: "lastName, year DESC" 
    });
  }}}
  
  The default order direction is ascending. You can change it to descending
  by writing DESC behind the property name like in the example above.
  If no order is given, or records are equal in respect to a given order,
  records will be ordered by guid.

  h2. hub.js Query Language
  
  Features of the query language:
  
  h4. Primitives:

  - record properties
  - null, undefined
  - true, false
  - numbers (integers and floats)
  - strings (double or single quoted)
  
  h4. Parameters:

  - %@ (wild card)
  - {parameterName} (named parameter)

  Wild cards are used to identify parameters by the order in which they appear 
  in the query string. Named parameters can be used when tracking the order 
  becomes difficult. Both types of parameters can be used by giving the 
  parameters as a property to your query object:
  
  {{{
    yourQuery.parameters = yourParameters ;
  }}}
  
  where yourParameters should have one of the following formats:

    for wild cards: [firstParam, secondParam, thirdParam]
    for named params: {name1: param1, mane2: parma2}

  You cannot use both types of parameters in a single query!
  
  h4. Operators:
  
  - =
  - !=
  - <
  - <=
  - >
  - >=
  - BEGINS_WITH (checks if a string starts with another one)
  - ENDS_WITH   (checks if a string ends with another one)
  - CONTAINS    (checks if a string contains another one, or if an object is in an array)
  - MATCHES     (checks if a string is matched by a regexp,
                you will have to use a parameter to insert the regexp)
  - ANY         (checks if the thing on its left is contained in the array
                on its right, you will have to use a parameter
                to insert the array)
  - TYPE_IS     (unary operator expecting a string containing the name 
                of a Model class on its right side, only records of this type
                will match)
    
  h4. Boolean Operators:
  
  - AND
  - OR
  - NOT
  
  h4. Parenthesis for grouping:
  
  - ( and )


  h2. Adding Your Own Query Handlers

  You can extend the query language with your own operators by calling:

  {{{
    hub.Query.registerQueryExtension('your_operator', your_op_definition) ;
  }}}

  See details below. As well you can provide your own comparison functions
  to control ordering of specific record properties like this:

  {{{
    hub.Query.registerComparison(property_name, comparison_for_property) ;
  }}}
  
  @class
  @extends hub.Object
  @extends hub.Copyable
  @extends hub.Freezable
*/

hub.Query = hub.Object.extend(hub.Copyable, hub.Freezable, 
  /** @scope hub.Query.prototype */ {

  // ..........................................................
  // PROPERTIES
  // 
  
  /** 
    Walk like a duck.
    
    @property {Boolean}
  */
  isQuery: true,
  
  /**
    Unparsed query conditions.  If you are handling a query yourself, then 
    you will find the base query string here.
    
    @property {String}
  */
  conditions:  null,
  
  /**
    Optional orderBy parameters.  This will be a string of keys, optionally
    beginning with the strings "DESC " or "ASC " to select descending or 
    ascending order.
    
    @property {String}
  */
  orderBy:     null,
  
  /**
    The base record type or types for the query.  This must be specified to
    filter the kinds of records this query will work on.  You may either 
    set this to a single record type or to an array or set of record types.
    
    @property {hub.Record}
  */
  recordType:  null,
  
  /**
    Optional array of multiple record types.  If the query accepts multiple 
    record types, this is how you can check for it.
    
    @property {hub.Enumerable}
  */
  recordTypes: null,
  
  /**
    Returns the complete set of recordTypes matched by this query.  Includes
    any named recordTypes plus their subclasses.
    
    @property {hub.Enumerable}
  */
  expandedRecordTypes: function() {
    var ret = hub.CoreSet.create(), rt, q  ;
    
    if (rt = this.get('recordType')) this._hub_scq_expandRecordType(rt, ret);      
    else if (rt = this.get('recordTypes')) {
      rt.forEach(function(t) { this._hub_scq_expandRecordType(t, ret); }, this);
    } else this._hub_scq_expandRecordType(hub.Record, ret);

    // save in queue.  if a new recordtype is defined, we will be notified.
    q = hub.Query._hub_scq_queriesWithExpandedRecordTypes;
    if (!q) {
      q = hub.Query._hub_scq_queriesWithExpandedRecordTypes = hub.CoreSet.create();
    }
    q.add(this);
    
    return ret.freeze() ;
  }.property('recordType', 'recordTypes').cacheable(),

  /** @private 
    expands a single record type into the set. called recursively
  */
  _hub_scq_expandRecordType: function(recordType, set) {
    if (set.contains(recordType)) return; // nothing to do
    set.add(recordType);
    
    if (hub.typeOf(recordType)===hub.T_STRING) {
      recordType = hub.objectForPropertyPath(recordType);
    }
    
    recordType.subclasses.forEach(function(t) { 
      this._hub_scq_expandRecordType(t, set);
    }, this);  
  },
  
  /**
    Optional hash of parameters.  These parameters may be interpolated into 
    the query conditions.  If you are handling the query manually, these 
    parameters will not be used.
    
    @property {Hash}
  */
  parameters:  null,
  
  /**
    Indicates the location where the result set for this query is stored.  
    Currently the available options are:
    
    - hub.Query.LOCAL: indicates that the query results will be automatically computed from the in-memory store.
    - hub.Query.REMOTE: indicates that the query results are kept on a remote server and hence must be loaded from the DataSource.
    
    The default setting for this property is hub.Query.LOCAL.  
    
    Note that even if a query location is LOCAL, your DataSource will still
    have its fetch() method called for the query.  For LOCAL queries, you 
    won't need to explicitly provide the query result set; you can just load
    records into the in-memory store as needed and let the query recompute 
    automatically.
    
    If your query location is REMOTE, then your DataSource will need to 
    provide the actual set of query results manually.  Usually you will only 
    need to use a REMOTE query if you are retrieving a large data set and you
    don't want to pay the cost of computing the result set client side.
    
    @property {String}
  */
  location: 'local', // hub.Query.LOCAL
  
  /**
    Another query that will optionally limit the search of records.  This is 
    usually configured for you when you do find() from another record array.
    
    @property {hub.Query}
  */
  scope: null,
  
  
  /**
    Returns true if query location is Remote.  This is sometimes more 
    convenient than checking the location.
    
    @property {Boolean}
  */
  isRemote: function() {
    return this.get('location') === hub.Query.REMOTE;
  }.property('location').cacheable(),

  /**
    Returns true if query location is Local.  This is sometimes more 
    convenient than checking the location.
    
    @property {Boolean}
  */
  isLocal: function() {
    return this.get('location') === hub.Query.LOCAL;
  }.property('location').cacheable(),
  
  /**
    Indicates whether a record is editable or not.  Defaults to false.  Local
    queries should never be made editable.  Remote queries may be editable or
    not depending on the data source.
  */
  isEditable: false,
  
  // ..........................................................
  // PRIMITIVE METHODS
  // 
  
  /** 
    Returns true if record is matched by the query, false otherwise.  This is 
    used when computing a query locally.  
 
    @param {hub.Record} record the record to check
    @param {Hash} parameters optional override parameters
    @returns {Boolean} true if record belongs, false otherwise
  */ 
  contains: function(record, parameters) {

    // check the recordType if specified
    var rtype, ret = true ;    
    if (rtype = this.get('recordTypes')) { // plural form
      ret = rtype.find(function(t) { return hub.kindOf(record, t); });
    } else if (rtype = this.get('recordType')) { // singular
      ret = hub.kindOf(record, rtype);
    }
    
    if (!ret) return false ; // if either did not pass, does not contain

    // if we have a scope - check for that as well
    var scope = this.get('scope');
    if (scope && !scope.contains(record)) return false ;
    
    // now try parsing
    if (!this._hub_isReady) this.parse(); // prepare the query if needed
    if (!this._hub_isReady) return false ;
    if (parameters === undefined) parameters = this.parameters || this;
    
    // if parsing worked we check if record is contained
    // if parsing failed no record will be contained
    return this._hub_tokenTree.evaluate(record, parameters);
  },
  
  /**
    Returns true if the query matches one or more of the record types in the
    passed set.
    
    @param {hub.Set} types set of record types
    @returns {Boolean} true if record types match
  */
  containsRecordTypes: function(types) {
    var rtype = this.get('recordType');
    if (rtype) {
      return !!types.find(function(t) { return hub.kindOf(t, rtype); });
    
    } else if (rtype = this.get('recordTypes')) {
      return !!rtype.find(function(t) { 
        return !!types.find(function(t2) { return hub.kindOf(t2,t); });
      });
      
    } else return true; // allow anything through
  },
  
  /**
    Returns the sort order of the two passed records, taking into account the
    orderBy property set on this query.  This method does not verify that the
    two records actually belong in the query set or not; this is checked using
    contains().
 
    @param {hub.Record} record1 the first record
    @param {hub.Record} record2 the second record
    @returns {Number} -1 if record1 < record2, 
                      +1 if record1 > record2,
                      0 if equal
  */
  compare: function(record1, record2) {

    var result = 0, 
        propertyName, order, len, i;

    // fast cases go here
    if (record1 === record2) return 0;
    
    // if called for the first time we have to build the order array
    if (!this._hub_isReady) this.parse();
    if (!this._hub_isReady) { // can't parse. guid is wrong but consistent
      return hub.compare(record1.get('id'),record2.get('id'));
    }
    
    // for every property specified in orderBy until non-eql result is found
    order = this._hub_order;
    len   = order ? order.length : 0;
    for (i=0; result===0 && (i < len); i++) {
      propertyName = order[i].propertyName;
      // if this property has a registered comparison use that
      if (hub.Query.comparisons[propertyName]) {
        result = hub.Query.comparisons[propertyName](
                  record1.get(propertyName),record2.get(propertyName));
                  
      // if not use default hub.compare()
      } else {
        result = hub.compare(
                  record1.get(propertyName), record2.get(propertyName) );
      }
      
      if ((result!==0) && order[i].descending) result = (-1) * result;
    }

    // return result or compare by guid
    if (result !== 0) return result ;
    else return hub.compare(record1.get('id'),record2.get('id'));
  },

  /** @private 
      Becomes true once the query has been successfully parsed 
  */
  _hub_isReady:     false,
  
  /**
    This method has to be called before the query object can be used.
    You will normaly not have to do this, it will be called automatically
    if you try to evaluate a query.
    You can however use this function for testing your queries.
 
    @returns {Boolean} true if parsing succeeded, false otherwise
  */
  parse: function() {
    var conditions = this.get('conditions'),
        lang       = this.get('queryLanguage'),
        tokens, tree;
        
    tokens = this._hub_tokenList = this.tokenizeString(conditions, lang);
    tree = this._hub_tokenTree = this.buildTokenTree(tokens, lang);
    this._hub_order = this.buildOrder(this.get('orderBy'));
    
    this._hub_isReady = !!tree && !tree.error;
    if (tree && tree.error) throw tree.error;
    return this._hub_isReady;
  },
  
  /**
    Returns the same query but with the scope set to the passed record array.
    This will copy the receiver.  It also stores these queries in a cache to
    reuse them if possible.
    
    @param {hub.RecordArray} recordArray the scope
    @returns {hub.Query} new query
  */
  queryWithScope: function(recordArray) {
    // look for a cached query on record array.
    var key = hub.keyFor('__query__', hub.guidFor(this)),
        ret = recordArray[key];
        
    if (!ret) {
      recordArray[key] = ret = this.copy();
      ret.set('scope', recordArray);
      ret.freeze();
    }
    
    return ret ;
  },
  
  // ..........................................................
  // PRIVATE SUPPORT
  // 

  /** @private
    Properties that need to be copied when cloning the query.
  */
  copyKeys: hub.w('conditions orderBy recordType recordTypes parameters location scope'),
  
  /** @private */
  concatenatedProperties: ['copyKeys'],

  /** @private 
    Implement the Copyable API to clone a query object once it has been 
    created.
  */
  copy: function() {
    var opts = {}, 
        keys = this.get('copyKeys'),
        loc  = keys ? keys.length : 0,
        key, value, ret;
        
    while(--loc >= 0) {
      key = keys[loc];
      value = this.get(key);
      if (value !== undefined) opts[key] = value ;
    }
    
    ret = this.constructor.create(opts);
    opts = null;
    return ret ;
  },

  // ..........................................................
  // QUERY LANGUAGE DEFINITION
  //
  
  
  /**
    This is the definition of the query language. You can extend it
    by using hub.Query.registerQueryExtension().
  */
  queryLanguage: {
    
    'UNKNOWN': {
      firstCharacter:   /[^\s'"\w\d\(\)\{\}]/,
      notAllowed:       /[\s'"\w\d\(\)\{\}]/
    },

    'PROPERTY': {
      firstCharacter:   /[a-zA-Z_]/,
      notAllowed:       /[^a-zA-Z_0-9]/,
      evalType:         'PRIMITIVE',
      
      /** @ignore */
      evaluate:         function (r,w) { return r.get(this.tokenValue); }
    },

    'NUMBER': {
      firstCharacter:   /\d/,
      notAllowed:       /[^\d\.]/,
      format:           /^\d+$|^\d+\.\d+$/,
      evalType:         'PRIMITIVE',
      
      /** @ignore */
      evaluate:         function (r,w) { return parseFloat(this.tokenValue); }
    },

    'STRING': {
      firstCharacter:   /['"]/,
      delimeted:        true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return this.tokenValue; }
    },

    'PARAMETER': {
      firstCharacter:   /\{/,
      lastCharacter:    '}',
      delimeted:        true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return w[this.tokenValue]; }
    },

    '%@': {
      rememberCount:    true,
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return w[this.tokenValue]; }
    },

    'OPEN_PAREN': {
      firstCharacter:   /\(/,
      singleCharacter:  true
    },

    'CLOSE_PAREN': {
      firstCharacter:   /\)/,
      singleCharacter:  true
    },

    'AND': {
      reservedWord:     true,
      leftType:         'BOOLEAN',
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left && right;
                        }
    },

    'OR': {
      reservedWord:     true,
      leftType:         'BOOLEAN',
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left || right;
                        }
    },

    'NOT': {
      reservedWord:     true,
      rightType:        'BOOLEAN',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var right = this.rightSide.evaluate(r,w);
                          return !right;
                        }
    },

    '=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left == right;
                        }
    },

    '!=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left != right;
                        }
    },

    '<': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left < right;
                        }
    },

    '<=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left <= right;
                        }
    },

    '>': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left > right;
                        }
    },

    '>=': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var left  = this.leftSide.evaluate(r,w);
                          var right = this.rightSide.evaluate(r,w);
                          return left >= right;
                        }
    },

    'BEGINS_WITH': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var all   = this.leftSide.evaluate(r,w);
                          var start = this.rightSide.evaluate(r,w);
                          return ( all.indexOf(start) === 0 );
                        }
    },

    'ENDS_WITH': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var all = this.leftSide.evaluate(r,w);
                          var end = this.rightSide.evaluate(r,w);
                          return ( all.indexOf(end) === (all.length - end.length) );
                        }
    },

    'CONTAINS': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
        evaluate:       function (r,w) {
                          var all    = this.leftSide.evaluate(r,w) || [];
                          var value = this.rightSide.evaluate(r,w);
                          switch(hub.typeOf(all)) {
                            case hub.T_STRING:
                              return (all.indexOf(value) !== -1); 
                            case hub.T_ARRAY:
                              var found  = false;
                              var i      = 0;
                              while ( found===false && i<all.length ) {
                                if ( value == all[i] ) found = true;
                                i++;
                              }
                              return found;
                            default:
                              //do nothing
                              break;
                          }
                        }
    },

    'ANY': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var prop   = this.leftSide.evaluate(r,w);
                          var values = this.rightSide.evaluate(r,w);
                          var found  = false;
                          var i      = 0;
                          while ( found===false && i<values.length ) {
                            if ( prop == values[i] ) found = true;
                            i++;
                          }
                          return found;
                        }
    },

    'MATCHES': {
      reservedWord:     true,
      leftType:         'PRIMITIVE',
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var toMatch = this.leftSide.evaluate(r,w);
                          var matchWith = this.rightSide.evaluate(r,w);
                          return matchWith.test(toMatch);
                        }
    },

    'TYPE_IS': {
      reservedWord:     true,
      rightType:        'PRIMITIVE',
      evalType:         'BOOLEAN',

      /** @ignore */
      evaluate:         function (r,w) {
                          var actualType = hub.Store.recordTypeFor(r.storeKey);
                          var right      = this.rightSide.evaluate(r,w);
                          var expectType = hub.objectForPropertyPath(right);
                          return actualType == expectType;
                          // FIXME: this should use hub.instanceOf or hub.kindOf, not strict equality
                        }
    },

    'null': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return null; }
    },

    'undefined': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return undefined; }
    },

    'false': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return false; }
    },

    'true': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return true; }
    },
    
    // For compatibility with SproutCore.
    'YES': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return true; }
    },
    
    'NO': {
      reservedWord:     true,
      evalType:         'PRIMITIVE',

      /** @ignore */
      evaluate:         function (r,w) { return false; }
    }
    
  },
  

  // ..........................................................
  // TOKENIZER
  //
  
  /**
    Takes a string and tokenizes it based on the grammar definition
    provided. Called by parse().
    
    @param {String} inputString the string to tokenize
    @param {Object} grammar the grammar definition (normally queryLanguage)
    @returns {Array} list of tokens
  */
  tokenizeString: function (inputString, grammar) {
    var tokenList           = [],
        c                   = null,
        t                   = null,
        token               = null,
        tokenType           = null,
        currentToken        = null,
        currentTokenType    = null,
        currentTokenValue   = null,
        currentDelimeter    = null,
        endOfString         = false,
        endOfToken          = false,
        belongsToToken      = false,
        skipThisCharacter   = false,
        rememberCount       = {};
  
  
    // helper function that adds tokens to the tokenList
  
    function addToken (tokenType, tokenValue) {
      t = grammar[tokenType];
      //tokenType = t.tokenType;
      
      // handling of special cases
      // check format
      if (t.format && !t.format.test(tokenValue)) tokenType = "UNKNOWN";
      // delimeted token (e.g. by ")
      if (t.delimeted) skipThisCharacter = true;
      
      // reserved words
      if ( !t.delimeted ) {
        for ( var anotherToken in grammar ) {
          if ( grammar[anotherToken].reservedWord
               && anotherToken == tokenValue ) {
            tokenType = anotherToken;
          }
        }
      }
      
      // reset t
      t = grammar[tokenType];
      // remembering count type
      if ( t && t.rememberCount ) {
        if (!rememberCount[tokenType]) rememberCount[tokenType] = 0;
        tokenValue = rememberCount[tokenType];
        rememberCount[tokenType] += 1;
      }

      // push token to list
      tokenList.push( {tokenType: tokenType, tokenValue: tokenValue} );

      // and clean up currentToken
      currentToken      = null;
      currentTokenType  = null;
      currentTokenValue = null;
    }
  
  
    // stepping through the string:
    
    if (!inputString) return [];
    
    var iStLength = inputString.length;
    
    for (var i=0; i < iStLength; i++) {
      
      // end reached?
      endOfString = (i===iStLength-1);
      
      // current character
      c = inputString.charAt(i);
    
      // set true after end of delimeted token so that
      // final delimeter is not catched again
      skipThisCharacter = false;
        
    
      // if currently inside a token
    
      if ( currentToken ) {
      
        // some helpers
        t = grammar[currentToken];
        endOfToken = t.delimeted ? c===currentDelimeter : t.notAllowed.test(c);
      
        // if still in token
        if ( !endOfToken ) currentTokenValue += c;
      
        // if end of token reached
        if (endOfToken || endOfString) {
          addToken(currentToken, currentTokenValue);
        }
      
        // if end of string don't check again
        if ( endOfString && !endOfToken ) skipThisCharacter = true;
      }
    
      // if not inside a token, look for next one
    
      if ( !currentToken && !skipThisCharacter ) {
        // look for matching tokenType
        for ( token in grammar ) {
          t = grammar[token];
          if (t.firstCharacter && t.firstCharacter.test(c)) {
            currentToken = token;
          }
        }

        // if tokenType found
        if ( currentToken ) {
          t = grammar[currentToken];
          currentTokenValue = c;
          // handling of special cases
          if ( t.delimeted ) {
            currentTokenValue = "";
            if ( t.lastCharacter ) currentDelimeter = t.lastCharacter;
            else currentDelimeter = c;
          }

          if ( t.singleCharacter || endOfString ) {
            addToken(currentToken, currentTokenValue);
          }
        }
      }
    }
    
    return tokenList;
  },
  
  
  
  // ..........................................................
  // BUILD TOKEN TREE
  //
  
  /**
    Takes an array of tokens and returns a tree, depending on the
    specified tree logic. The returned object will have an error property
    if building of the tree failed. Check it to get some information
    about what happend.
    If everything worked the tree can be evaluated by calling:
    
      tree.evaluate(record, parameters)
    
    If tokenList is empty, a single token will be returned which will
    evaluate to true for all records.
    
    @param {Array} tokenList the list of tokens
    @param {Object} treeLogic the logic definition (normally queryLanguage)
    @returns {Object} token tree
  */
  buildTokenTree: function (tokenList, treeLogic) {
  
    var l                    = tokenList.slice();
    var i                    = 0;
    var openParenthesisStack = [];
    var shouldCheckAgain     = false;
    var error                = [];
    
  
    // empty tokenList is a special case
    if (!tokenList || tokenList.length === 0) {
      return { evaluate: function(){ return true; } };
    }
  
  
    // some helper functions
  
    function tokenLogic (position) {
      var p = position;
      if ( p < 0 ) return false;
      
      var tl = treeLogic[l[p].tokenType];
      
      if ( ! tl ) {
        error.push("logic for token '"+l[p].tokenType+"' is not defined");
        return false;
      }

      // save evaluate in token, so that we don't have
      // to look it up again when evaluating the tree
      l[p].evaluate = tl.evaluate;
      return tl;
    }
  
    function expectedType (side, position) {
      var p = position;
      var tl = tokenLogic(p);
      if ( !tl )            return false;
      if (side == 'left')   return tl.leftType;
      if (side == 'right')  return tl.rightType;
    }
  
    function evalType (position) {
      var p = position;
      var tl = tokenLogic(p);
      if ( !tl )  return false;
      else        return tl.evalType;
    }
  
    function removeToken (position) {
      l.splice(position, 1);
      if ( position <= i ) i--;
    }
  
    function preceedingTokenExists (position) {
      var p = position || i;
      if ( p > 0 )  return true;
      else          return false;
    }
  
    function tokenIsMissingChilds (position) {
      var p = position;
      if ( p < 0 )  return true;
      return (expectedType('left',p) && !l[p].leftSide)
          || (expectedType('right',p) && !l[p].rightSide);
    }
  
    function typesAreMatching (parent, child) {
      var side = (child < parent) ? 'left' : 'right';
      if ( parent < 0 || child < 0 )                      return false;
      if ( !expectedType(side,parent) )                   return false;
      if ( !evalType(child) )                             return false;
      if ( expectedType(side,parent) == evalType(child) ) return true;
      else                                                return false;
    }
  
    function preceedingTokenCanBeMadeChild (position) {
      var p = position;
      if ( !tokenIsMissingChilds(p) )   return false;
      if ( !preceedingTokenExists(p) )  return false;
      if ( typesAreMatching(p,p-1) )    return true;
      else                              return false;
    }
  
    function preceedingTokenCanBeMadeParent (position) {
      var p = position;
      if ( tokenIsMissingChilds(p) )    return false;
      if ( !preceedingTokenExists(p) )  return false;
      if ( !tokenIsMissingChilds(p-1) ) return false;
      if ( typesAreMatching(p-1,p) )    return true;
      else                              return false;
    }
  
    function makeChild (position) {
      var p = position;
      if (p<1) return false;
      l[p].leftSide = l[p-1];
      removeToken(p-1);
    }
  
    function makeParent (position) {
      var p = position;
      if (p<1) return false;
      l[p-1].rightSide = l[p];
      removeToken(p);
    }
  
    function removeParenthesesPair (position) {
      removeToken(position);
      removeToken(openParenthesisStack.pop());
    }
  
    // step through the tokenList
  
    for (i=0; i < l.length; i++) {
      shouldCheckAgain = false;
    
      if ( l[i].tokenType == 'UNKNOWN' ) {
        error.push('found unknown token: '+l[i].tokenValue);
      }
      
      if ( l[i].tokenType == 'OPEN_PAREN' ) openParenthesisStack.push(i);
      if ( l[i].tokenType == 'CLOSE_PAREN' ) removeParenthesesPair(i);
      
      if ( preceedingTokenCanBeMadeChild(i) ) makeChild(i);
      
      if ( preceedingTokenCanBeMadeParent(i) ){
        makeParent(i);
        shouldCheckAgain = true;
      } 
      
      if ( shouldCheckAgain ) i--;
    
    }
  
    // error if tokenList l is not a single token now
    if (l.length == 1) l = l[0];
    else error.push('string did not resolve to a single tree');
  
    // error?
    if (error.length > 0) return {error: error.join(',\n'), tree: l};
    // everything fine - token list is now a tree and can be returned
    else return l;
  
  },
  
  
  // ..........................................................
  // ORDERING
  //
  
  /**
    Takes a string containing an order statement and returns an array
    describing this order for easier processing.
    Called by parse().
    
    @param {String} orderString the string containing the order statement
    @returns {Array} array of order statement
  */
  buildOrder: function (orderString) {
    if (!orderString) {
      return [];
    }
    else {
      var o = orderString.split(',');
      for (var i=0; i < o.length; i++) {
        var p = o[i];
        p = p.replace(/^\s+|\s+$/,'');
        p = p.replace(/\s+/,',');
        p = p.split(',');
        o[i] = {propertyName: p[0]};
        if (p[1] && p[1] == 'DESC') o[i].descending = true;
      }
      
      return o;
    }
    
  }

});


// Class Methods
hub.Query.mixin( /** @scope hub.Query */ {

  /** 
    Constant used for hub.Query#location
    
    @property {String}
  */
  LOCAL: 'local',
  
  /** 
    Constant used for hub.Query#location 
    
    @property {String}
  */
  REMOTE: 'remote',
  
  /**
    Given a query, returns the associated storeKey.  For the inverse of this 
    method see hub.Store.queryFor().
    
    @param {hub.Query} query the query
    @returns {Number} a storeKey.
  */
  storeKeyFor: function(query) {
    return query ? query.get('storeKey') : null;
  },
  
  /**
    Will find which records match a give hub.Query and return an array of 
    store keys. This will also apply the sorting for the query.
    
    @param {hub.Query} query to apply
    @param {hub.RecordArray} records to search within
    @param {hub.Store} store to materialize record from
    @returns {Array} array instance of store keys matching the hub.Query (sorted)
  */
  containsRecords: function(query, records, store) {
    var ret = [];
    for(var idx=0,len=records.get('length');idx<len;idx++) {
      var record = records.objectAt(idx);
      if(record && query.contains(record)) {
        ret.push(record.get('storeKey'));
      }
    }
    
    ret = hub.Query.orderStoreKeys(ret, query, store);
    
    return ret;
  },
  
  /** 
    Sorts a set of store keys according to the orderBy property
    of the hub.Query.
    
    @param {Array} storeKeys to sort
    @param {hub.Query} query to use for sorting
    @param {hub.Store} store to materialize records from
    @returns {Array} sorted store keys.  may be same instance as passed value
  */
  orderStoreKeys: function(storeKeys, query, store) {
    // apply the sort if there is one
    if (storeKeys) {
      
      // Set tmp variable because we can't pass variables to sort function.
      // Do this instead of generating a temporary closure function for perf
      hub.Query._hub_TMP_STORE = store;
      hub.Query._hub_TMP_QUERY_KEY = query;
      storeKeys.sort(hub.Query.compareStoreKeys);
      hub.Query._hub_TMP_STORE = hub.Query._hub_TMP_QUERY_KEY = null;
    }
    
    return storeKeys;
  },
  
  /** 
    Default sort method that is used when calling containsStoreKeys()
    or containsRecords() on this query. Simply materializes two records based 
    on storekeys before passing on to compare() .
 
    @param {Number} storeKey1 a store key
    @param {Number} storeKey2 a store key
    @returns {Number} -1 if record1 < record2,  +1 if record1 > record2, 0 if equal
  */
  compareStoreKeys: function(storeKey1, storeKey2) {
    var store    = hub.Query._hub_TMP_STORE,
        queryKey = hub.Query._hub_TMP_QUERY_KEY,
        record1  = store.materializeRecord(storeKey1),
        record2  = store.materializeRecord(storeKey2);
    return queryKey.compare(record1, record2);
  },
  
  /**
    Returns a hub.Query instance reflecting the passed properties.  Where 
    possible this method will return cached query instances so that multiple 
    calls to this method will return the same instance.  This is not possible 
    however, when you pass custom parameters or set ordering. All returned 
    queries are frozen.
    
    Usually you will not call this method directly.  Instead use the more
    convenient hub.Query.local() and hub.Query.remote().
    
    h2. Examples
    
    There are a number of different ways you can call this method.  
    
    The following return local queries selecting all records of a particular 
    type or types, including any subclasses:
    
    {{{
      var people = hub.Query.local(Ab.Person);
      var peopleAndCompanies = hub.Query.local([Ab.Person, Ab.Company]);
      
      var people = hub.Query.local('Ab.Person');
      var peopleAndCompanies = hub.Query.local(hub.w('Ab.Person Ab.Company'));
      
      var allRecords = hub.Query.local(hub.Record);
    }}} 
    
    The following will match a particular type of condition:
    
    {{{
      var married = hub.Query.local(Ab.Person, "isMarried=true");
      var married = hub.Query.local(Ab.Person, "isMarried=%@", [true]);
      var married = hub.Query.local(Ab.Person, "isMarried={married}", {
        married: true
      });
    }}}
    
    You can also pass a hash of options as the second parameter.  This is 
    how you specify an order, for example:
    
    {{{
      var orderedPeople = hub.Query.local(Ab.Person, { orderBy: "firstName" });
    }}}
    
    @param {String} location the query location.
    @param {hub.Record|Array} recordType the record type or types.
    @param {String} conditions optional conditions
    @param {Hash} params optional params. or pass multiple args.
    @returns {hub.Query}
  */
  build: function(location, recordType, conditions, params) {
    
    var opts = null,
        ret, cache, key, tmp;
    
    // fast case for query objects.
    if (recordType && recordType.isQuery) { 
      if (recordType.get('location') === location) return recordType;
      else return recordType.copy().set('location', location).freeze();
    }
    
    // normalize recordType
    if (typeof recordType === hub.T_STRING) {
      ret = hub.objectForPropertyPath(recordType);
      if (!ret) throw hub.fmt("%@ did not resolve to a class", recordType);
      recordType = ret ;
    } else if (recordType && recordType.isEnumerable) {
      ret = [];
      recordType.forEach(function(t) {
        if (typeof t === hub.T_STRING) t = hub.objectForPropertyPath(t);
        if (!t) throw hub.fmt("cannot resolve record types: %@", recordType);
        ret.push(t);
      }, this);
      recordType = ret ;
    } else if (!recordType) recordType = hub.Record; // find all records
    
    if (params === undefined) params = null;
    if (conditions === undefined) conditions = null;

    // normalize other params. if conditions is just a hash, treat as opts
    if (!params && (typeof conditions !== hub.T_STRING)) {
      opts = conditions;
      conditions = null ;
    }
    
    // special case - easy to cache.
    if (!params && !opts) {

      tmp = hub.Query._hub_scq_recordTypeCache;
      if (!tmp) tmp = hub.Query._hub_scq_recordTypeCache = {};
      cache = tmp[location];
      if (!cache) cache = tmp[location] = {}; 
      
      if (recordType.isEnumerable) {
        key = recordType.map(function(k) { return hub.guidFor(k); });
        key = key.sort().join(':');
      } else key = hub.guidFor(recordType);
      
      if (conditions) key = [key, conditions].join('::');
      
      ret = cache[key];
      if (!ret) {
        if (recordType.isEnumerable) {
          opts = { recordTypes: recordType.copy() };
        } else opts = { recordType: recordType };
        
        opts.location = location ;
        opts.conditions = conditions ;
        ret = cache[key] = hub.Query.create(opts).freeze();
      }
    // otherwise parse extra conditions and handle them
    } else {

      if (!opts) opts = {};
      if (!opts.location) opts.location = location ; // allow override

      // pass one or more recordTypes.
      if (recordType && recordType.isEnumerable) {
        opts.recordsTypes = recordType;
      } else opts.recordType = recordType;

      // set conditions and params if needed
      if (conditions) opts.conditions = conditions;
      if (params) opts.parameters = params;

      ret = hub.Query.create(opts).freeze();
    }
    
    return ret ;
  },
  
  /**
    Returns a LOCAL query with the passed options.  For a full description of
    the parameters you can pass to this method, see hub.Query.build().
  
    @param {hub.Record|Array} recordType the record type or types.
    @param {String} conditions optional conditions
    @param {Hash} params optional params. or pass multiple args.
    @returns {hub.Query}
  */
  local: function(recordType, conditions, params) {
    return this.build(hub.Query.LOCAL, recordType, conditions, params);
  },
  
  /**
    Returns a REMOTE query with the passed options.  For a full description of
    the parameters you can pass to this method, see hub.Query.build().
    
    @param {hub.Record|Array} recordType the record type or types.
    @param {String} conditions optional conditions
    @param {Hash} params optional params. or pass multiple args.
    @returns {hub.Query}
  */
  remote: function(recordType, conditions, params) {
    return this.build(hub.Query.REMOTE, recordType, conditions, params);
  },
  
  /** @private 
    called by hub.Record.extend(). invalided expandedRecordTypes
  */
  _hub_scq_didDefineRecordType: function() {
    var q = hub.Query._hub_scq_queriesWithExpandedRecordTypes;
    if (q) {
      q.forEach(function(query) { 
        query.notifyPropertyChange('expandedRecordTypes');
      }, this);
      q.clear();
    }
  }
  
});


/** @private
  Hash of registered comparisons by propery name. 
*/
hub.Query.comparisons = {};

/**
  Call to register a comparison for a specific property name.
  The function you pass should accept two values of this property
  and return -1 if the first is smaller than the second,
  0 if they are equal and 1 if the first is greater than the second.
  
  @param {String} name of the record property
  @param {Function} custom comparison function
  @returns {hub.Query} receiver
*/
hub.Query.registerComparison = function(propertyName, comparison) {
  hub.Query.comparisons[propertyName] = comparison;
};


/**
  Call to register an extension for the query language.
  You shoud provide a name for your extension and a definition
  specifying how it should be parsed and evaluated.
  
  Have a look at queryLanguage for examples of definitions.
  
  TODO add better documentation here
  
  @param {String} tokenName name of the operator
  @param {Object} token extension definition
  @returns {hub.Query} receiver
*/
hub.Query.registerQueryExtension = function(tokenName, token) {
  hub.Query.prototype.queryLanguage[tokenName] = token;
};

// shorthand
hub.Q = hub.Query.from ;
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  hub.RecordArray wraps an array of storeKeys and, optionally, a Query object.
  When you access the items of a hub.RecordArray it will automatically convert 
  the storeKeys into actual hub.Record objects that the rest of your 
  application can work with.
  
  Normally you do not create RecordArrays directly.  Instead, a RecordArray 
  is returned when you call hub.Store.find(), already properly configured.
  You can usually just work with the RecordArray instance just like another 
  array.
  
  The information below about RecordArray internals is only intended for those 
  who need to override this class for some reason to do some special.
  
  h2. Internal Notes
  
  Normally the RecordArray behavior is very simple.  Any array-like operations 
  will be translated into similar calls onto the underlying array of 
  storeKeys.  The underlying array can be a real array or it may be a 
  SparseArray, which is how you implement incremental loading.
  
  If the RecordArray is created with a hub.Query object (this is typical), the 
  RecordArray will also consult the query for various delegate operations such 
  as determining if the record array should update automatically whenever 
  records in the store change.
  
  It will also ask the Query to refresh the storeKeys whenever records are 
  changed in the store.
  
  @class
  @extends hub.Object
  @extends hub.Enumerable
  @extends hub.Array
*/

hub.RecordArray = hub.Object.extend(hub.Enumerable, hub.Array,
  /** @scope hub.RecordArray.prototype */ {
    
  /**
    The store that owns this record array.  All record arrays must have a 
    store to function properly. 
    
    NOTE: You MUST set this property on the RecordArray when creating it or 
    else it will fail.
  
    @property {hub.Store}
  */
  store: null,

  /**
    The Query object this record array is based upon.  All record arrays MUST 
    have an associated query in order to function correctly.  You cannot 
    change this property once it has been set.

    NOTE: You MUST set this property on the RecordArray when creating it or 
    else it will fail.
    
    @property {hub.Query}
  */
  query: null,

  /**
    The array of storeKeys as retrieved from the owner store.
    
    @property {hub.Array}
  */
  storeKeys: null,

  /**
    The current status for the record array.  Read from the underlying 
    store.
    
    @property {Number}
  */
  status: hub.Record.EMPTY,
  
  /**
    The current editabile state based on the query.
    
    @property {Boolean}
  */
  isEditable: function() {
    var query = this.get('query');
    return query ? query.get('isEditable') : false;
  }.property('query').cacheable(),
  
  // ..........................................................
  // ARRAY PRIMITIVES
  // 

  /** @private
    Returned length is a pass-through to the storeKeys array.
  */
  length: function() {
    this.flush(); // cleanup pending changes
    var storeKeys = this.get('storeKeys');
    return storeKeys ? storeKeys.get('length') : 0;
  }.property('storeKeys').cacheable(),

  _hub_scra_records: null,
  
  /** @private
    Looks up the store key in the store keys array and materializes a
    records.
    
    @param {Number} idx index of the object
    @return {hub.Record} materialized record
  */
  objectAt: function(idx) {

    this.flush(); // cleanup pending if needed

    var recs      = this._hub_scra_records, 
        storeKeys = this.get('storeKeys'),
        store     = this.get('store'),
        storeKey, ret ;
    
    if (!storeKeys || !store) return undefined; // nothing to do
    if (recs && (ret=recs[idx])) return ret ; // cached
    
    // not in cache, materialize
    if (!recs) this._hub_scra_records = recs = [] ; // create cache
    storeKey = storeKeys.objectAt(idx);
    
    if (storeKey) {
      // if record is not loaded already, then ask the data source to 
      // retrieve it
      if (store.peekStatus(storeKey) === hub.Record.EMPTY) {
        store.retrieveRecord(null, null, storeKey);
      }
      recs[idx] = ret = store.materializeRecord(storeKey);
    }
    return ret ;
  },

  /** @private - optimized forEach loop. */
  forEach: function(callback, target) {
    this.flush();
    
    var recs      = this._hub_scra_records, 
        storeKeys = this.get('storeKeys'),
        store     = this.get('store'), 
        len       = storeKeys ? storeKeys.get('length') : 0,
        idx, storeKey, rec;
        
    if (!storeKeys || !store) return this; // nothing to do    
    if (!recs) recs = this._hub_scra_records = [] ;
    if (!target) target = this;
    
    for(idx=0;idx<len;idx++) {
      rec = recs[idx];
      if (!rec) {
        rec = recs[idx] = store.materializeRecord(storeKeys.objectAt(idx));
      }
      callback.call(target, rec, idx, this);
    }
    
    return this;
  },
  
  /** @private
    Pass through to the underlying array.  The passed in objects must be
    records, which can be converted to storeKeys.
    
    @param {Number} idx start index
    @param {Number} amt end index
    @param {hub.RecordArray} recs to replace with records
    @return {hub.RecordArray} 'this' after replace
  */
  replace: function(idx, amt, recs) {

    this.flush(); // cleanup pending if needed
    
    var storeKeys = this.get('storeKeys'), 
        len       = recs ? (recs.get ? recs.get('length') : recs.length) : 0,
        i, keys;
        
    if (!storeKeys) throw "storeKeys required";

    var query = this.get('query');
    if (query && !query.get('isEditable')) throw hub.RecordArray.NOT_EDITABLE;
    
    // you can't modify an array whose store keys are autogenerated from a 
    // query.
    
    // map to store keys
    keys = [] ;
    for(i=0;i<len;i++) keys[i] = recs.objectAt(i).get('storeKey');
    
    // pass along - if allowed, this should trigger the content observer 
    storeKeys.replace(idx, amt, keys);
    return this; 
  },
  
  /**
    Returns true if the passed can be found in the record array.  This is 
    provided for compatibility with hub.Set.
    
    @param {hub.Record} record the record
    @returns {Boolean}
  */
  contains: function(record) {
    return this.indexOf(record)>=0;
  },
  
  /** @private
    Returns the first index where the specified record is found.
    
    @param {hub.Record} record the record
    @param {Number} startAt optional starting index
    @returns {Number} index
  */
  indexOf: function(record, startAt) {
    if (!hub.kindOf(record, hub.Record)) return false ; // only takes records
    
    this.flush();
    
    var storeKey  = record.get('storeKey'), 
        storeKeys = this.get('storeKeys');
        
    return storeKeys ? storeKeys.indexOf(storeKey, startAt) : -1; 
  },

  /** @private 
    Returns the last index where the specified record is found.
    
    @param {hub.Record} record the record
    @param {Number} startAt optional starting index
    @returns {Number} index
  */
  lastIndexOf: function(record, startAt) {
    if (!hub.kindOf(record, hub.Record)) return false ; // only takes records

    this.flush();
    
    var storeKey  = record.get('storeKey'), 
        storeKeys = this.get('storeKeys');
    return storeKeys ? storeKeys.lastIndexOf(storeKey, startAt) : -1; 
  },

  /** 
    Adds the specified record to the record array if it is not already part 
    of the array.  Provided for compatibilty with hub.Set.
    
    @param {hub.Record} record
    @returns {hub.RecordArray} receiver
  */
  add: function(record) {
    if (!hub.kindOf(record, hub.Record)) return this ;
    if (this.indexOf(record)<0) this.pushObject(record);
    return this ;
  },
  
  /**
    Removes the specified record from the array if it is not already a part
    of the array.  Provided for compatibility with hub.Set.
    
    @param {hub.Record} record
    @returns {hub.RecordArray} receiver
  */
  remove: function(record) {
    if (!hub.kindOf(record, hub.Record)) return this ;
    this.removeObject(record);
    return this ;
  },
  
  // ..........................................................
  // HELPER METHODS
  // 

  /**
    Extends the standard hub.Enumerable implementation to return results based
    on a Query if you pass it in.
    
    @param {hub.Query} query a hub.Query object
    @returns {hub.RecordArray} 
  */
  find: function(query, target) {
    if (query && query.isQuery) {
      return this.get('store').find(query.queryWithScope(this)) ;
    } else return arguments.callee.base.apply(this, arguments) ;
  },
  
  /**
    Call whenever you want to refresh the results of this query.  This will
    notify the data source, asking it to refresh the contents.
    
    @returns {hub.RecordArray} receiver
  */
  refresh: function() {
    this.get('store').refreshQuery(this.get('query'));  
  },
  
  /**
    Destroys the record array.  Releases any storeKeys, and deregisters with
    the owner store.
    
    @returns {hub.RecordArray} receiver
  */
  destroy: function() {
    if (!this.get('isDestroyed')) {
      this.get('store').recordArrayWillDestroy(this);
    } 
    
    arguments.callee.base.apply(this, arguments) ;
  },
  
  // ..........................................................
  // STORE CALLBACKS
  // 
  
  // NOTE: storeWillFetchQuery(), storeDidFetchQuery(), storeDidCancelQuery(),
  // and storeDidErrorQuery() are tested implicitly through the related
  // methods in hub.Store.  We're doing it this way because eventually this 
  // particular implementation is likely to change; moving some or all of this
  // code directly into the store. -CAJ
  
  /** @private
    Called whenever the store initiates a refresh of the query.  Sets the 
    status of the record array to the appropriate status.
    
    @param {hub.Query} query
    @returns {hub.RecordArray} receiver
  */
  storeWillFetchQuery: function(query) {
    var status = this.get('status'),
        K      = hub.Record;
    if ((status === K.EMPTY) || (status === K.ERROR)) status = K.BUSY_LOADING;
    if (status & K.READY) status = K.BUSY_REFRESH;
    this.setIfChanged('status', status);
    return this ;
  },
  
  /** @private
    Called whenever the store has finished fetching a query.
    
    @param {hub.Query} query
    @returns {hub.RecordArray} receiver
  */
  storeDidFetchQuery: function(query) {
    this.setIfChanged('status', hub.Record.READY_CLEAN);
    return this ;
  },
  
  /** @private
    Called whenever the store has cancelled a refresh.  Sets the 
    status of the record array to the appropriate status.
    
    @param {hub.Query} query
    @returns {hub.RecordArray} receiver
  */
  storeDidCancelQuery: function(query) {
    var status = this.get('status'),
        K      = hub.Record;
    if (status === K.BUSY_LOADING) status = K.EMPTY;
    else if (status === K.BUSY_REFRESH) status = K.READY_CLEAN;
    this.setIfChanged('status', status);
    return this ;
  },

  /** @private
    Called whenever the store encounters an error while fetching.  Sets the 
    status of the record array to the appropriate status.
    
    @param {hub.Query} query
    @returns {hub.RecordArray} receiver
  */
  storeDidErrorQuery: function(query) {
    this.setIfChanged('status', hub.Record.ERROR);
    return this ;
  },
  
  /** @private
    Called by the store whenever it changes the state of certain store keys.
    If the receiver cares about these changes, it will mark itself as dirty.
    The next time you try to access the record array it will update any 
    pending changes.
    
    @param {hub.Array} storeKeys the effected store keys
    @param {hub.Set} recordTypes the record types for the storeKeys.
    @returns {hub.RecordArray} receiver
  */
  storeDidChangeStoreKeys: function(storeKeys, recordTypes) {
    var query =  this.get('query');
    // fast path exits
    if (query.get('location') !== hub.Query.LOCAL) return this;
    if (!query.containsRecordTypes(recordTypes)) return this;   
    
    // ok - we're interested.  mark as dirty and save storeKeys.
    var changed = this._hub_scq_changedStoreKeys;
    if (!changed) changed = this._hub_scq_changedStoreKeys = hub.IndexSet.create();
    changed.addEach(storeKeys);
    
    this.set('needsFlush', true);
    this.enumerableContentDidChange();

    return this;
  },
  
  /**
    Applies the query to any pending changed store keys, updating the record
    array contents as necessary.  This method is called automatically anytime
    you access the RecordArray to make sure it is up to date, but you can 
    call it yourself as well if you need to force the record array to fully
    update immediately.
    
    Currently this method only has an effect if the query location is 
    hub.Query.LOCAL.  You can call this method on any RecordArray however,
    without an error.
    
    @returns {hub.RecordArray} receiver
  */
  flush: function() {
    if (!this.get('needsFlush')) return this; // nothing to do
    this.set('needsFlush', false); // avoid running again.
    
    // fast exit
    var query = this.get('query'),
        store = this.get('store'); 
    if (!store || !query || query.get('location') !== hub.Query.LOCAL) {
      return this;
    }
    
    // OK, actually generate some results
    var storeKeys = this.get('storeKeys'),
        changed   = this._hub_scq_changedStoreKeys,
        didChange = false,
        K         = hub.Record,
        rec, status, recordType, sourceKeys, scope, included;

    // if we have storeKeys already, just look at the changed keys
    if (storeKeys) {
      if (changed) {
        changed.forEach(function(storeKey) {
          // get record - do not include EMPTY or DESTROYED records
          status = store.peekStatus(storeKey);
          if (!(status & K.EMPTY) && !((status & K.DESTROYED) || (status === K.BUSY_DESTROYING))) {
            rec = store.materializeRecord(storeKey);
            included = !!(rec && query.contains(rec));
          } else included = false ;
          
          // if storeKey should be in set but isn't -- add it.
          if (included) {
            if (storeKeys.indexOf(storeKey)<0) {
              if (!didChange) storeKeys = storeKeys.copy(); 
              storeKeys.pushObject(storeKey); 
            }
          // if storeKey should NOT be in set but IS -- remove it
          } else {
            if (storeKeys.indexOf(storeKey)>=0) {
              if (!didChange) storeKeys = storeKeys.copy();
              storeKeys.removeObject(storeKey);
            } // if (storeKeys.indexOf)
          } // if (included)
        }, this);
        // make sure resort happens
        didChange = true ;
      } // if (changed)
    
    // if no storeKeys, then we have to go through all of the storeKeys 
    // and decide if they belong or not.  ick.
    } else {
      
      // collect the base set of keys.  if query has a parent scope, use that
      if (scope = query.get('scope')) {
        sourceKeys = scope.flush().get('storeKeys');

      // otherwise, lookup all storeKeys for the named recordType...
      } else if (recordType = query.get('expandedRecordTypes')) {
        sourceKeys = hub.IndexSet.create();
        recordType.forEach(function(cur) { 
          sourceKeys.addEach(store.storeKeysFor(recordType));
        });
      }

      // loop through storeKeys to determine if it belongs in this query or 
      // not.
      storeKeys = [];
      sourceKeys.forEach(function(storeKey) {
        status = store.peekStatus(storeKey);
        if (!(status & K.EMPTY) && !((status & K.DESTROYED) || (status === K.BUSY_DESTROYING))) {
          rec = store.materializeRecord(storeKey);
          if (rec && query.contains(rec)) storeKeys.push(storeKey);
        }
      });
      
      didChange = true ;
    }

    // clear set of changed store keys
    if (changed) changed.clear();
    
    // only resort and update if we did change
    if (didChange) {
      storeKeys = hub.Query.orderStoreKeys(storeKeys, query, store);
      this.set('storeKeys', hub.clone(storeKeys)); // replace content
    }
    
    return this;
  },

  /**
    Set to true when the query is dirty and needs to update its storeKeys 
    before returning any results.  RecordArrays always start dirty and become
    clean the first time you try to access their contents.
    
    @property {Boolean}
  */
  needsFlush: true,

  // ..........................................................
  // EMULATE hub.Error API
  // 
  
  /**
    Returns true whenever the status is hub.Record.ERROR.  This will allow you 
    to put the UI into an error state.
    
    @property {Boolean}
  */
  isError: function() {
    return this.get('status') & hub.Record.ERROR;
  }.property('status').cacheable(),

  /**
    Returns the receiver if the record array is in an error state.  Returns null
    otherwise.
    
    @property {hub.Record}
  */
  errorValue: function() {
    return this.get('isError') ? hub.val(this.get('errorObject')) : null ;
  }.property('isError').cacheable(),
  
  /**
    Returns the current error object only if the record array is in an error state.
    If no explicit error object has been set, returns hub.Record.GENERIC_ERROR.
    
    @property {hub.Error}
  */
  errorObject: function() {
    if (this.get('isError')) {
      var store = this.get('store');
      return store.readQueryError(this.get('query')) || hub.Record.GENERIC_ERROR;
    } else return null ;
  }.property('isError').cacheable(),
  
  // HACK to be able to refresh a query-backed record array from the server
  refresh: function() {
    var store = this.get('store') ;
    if (!store) return ;
    var source = store._hub_getDataSource() ; // TODO why is this private?
    if (!source || source.fetch === undefined) return ;
    var fetchKey = this.get('queryKey') ;
    if (!fetchKey) return ;
    source.fetch.call(source, store, fetchKey, null) ;
    return this ;
  },
  
  // ..........................................................
  // INTERNAL SUPPORT
  // 
  
  /** @private 
    Invoked whenever the storeKeys array changes.  Observes changes.
  */
  _hub_storeKeysDidChange: function() {
    var storeKeys = this.get('storeKeys');
    
    var prev = this._hub_prevStoreKeys, 
        f    = this._hub_storeKeysContentDidChange,
        fs   = this._hub_storeKeysStateDidChange;
    
    if (storeKeys === prev) return this; // nothing to do
    
    if (prev) prev.removeObserver('[]', this, f);
    this._hub_prevStoreKeys = storeKeys;
    if (storeKeys) storeKeys.addObserver('[]', this, f);
    
    var rev = (storeKeys) ? storeKeys.propertyRevision : -1 ;
    this._hub_storeKeysContentDidChange(storeKeys, '[]', storeKeys, rev);
    
  }.observes('storeKeys'),
  
  /** @private
    Invoked whenever the content of the storeKeys array changes.  This will
    dump any cached record lookup and then notify that the enumerable content
    has changed.
  */
  _hub_storeKeysContentDidChange: function(target, key, value, rev) {
    if (this._hub_scra_records) this._hub_scra_records.length=0 ; // clear cache
    
    this.beginPropertyChanges()
      .notifyPropertyChange('length')
      .enumerableContentDidChange()
    .endPropertyChanges();
  },
  
  /** @private */
  init: function() {
    arguments.callee.base.apply(this, arguments) ;
    this._hub_storeKeysDidChange() ;
  }
  
});

hub.RecordArray.mixin({  
  
  /** 
    Standard error throw when you try to modify a record that is not editable
    
    @property {hub.Error}
  */
  NOT_EDITABLE: hub.Error.desc("hub.RecordArray is not editable")
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            See below for additional copyright information.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/*!
  Math.uuid.js (v1.4)
  http://www.broofa.com
  mailto:robert@broofa.com
 
  Copyright (c) 2009 Robert Kieffer
  Dual licensed under the MIT and GPL licenses.
*/
/*
 Generate a random uuid.
 
 USAGE: Math.uuid(length, radix)
   length - the desired number of characters
   radix  - the number of allowable values for each character.
 
 EXAMPLES:
   // No arguments  - returns RFC4122, version 4 ID
   >>> Math.uuid()
   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 
   // One argument - returns ID of the specified length
   >>> Math.uuid(15)     // 15 character ID (default base=62)
   "VcydxgltxrVZSTV"
 
   // Two arguments - returns ID of the specified length, and radix. (Radix must be <= 62)
   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
   "01001010"
   >>> Math.uuid(8, 10) // 8 character ID (base=10)
   "47473046"
   >>> Math.uuid(8, 16) // 8 character ID (base=16)
   "098F4D35"
*/
hub.uuid = (function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''); 
  
  return function (len, radix) {
    var chars = CHARS, uuid = [], i;
    radix = radix || chars.length;
    
    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;
      
      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';
      
      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }
    
    return uuid.join('');
  };
})();
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            See below for additional copyright information.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

// FIXME: Replace with code with a known license!
// Based on the Secure Hash Algorithm (SHA256) at http://www.webtoolkit.info/
// Original code by Angel Marin, Paul Johnston.
hub.SHA256 = function (s){
  var chrsz = 8, hexcase = 0 ;

  function safe_add (x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }
  function R (X, n) { return ( X >>> n ); }
  function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
  function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
  function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
  function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
  function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
  function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

  function core_sha256 (m, l) {
    var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
    var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;

    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >> 9) << 4) + 15] = l;

    for ( var i = 0; i<m.length; i+=16 ) {
      a = HASH[0];
      b = HASH[1];
      c = HASH[2];
      d = HASH[3];
      e = HASH[4];
      f = HASH[5];
      g = HASH[6];
      h = HASH[7];

      for ( var j = 0; j<64; j++) {
        if (j < 16) W[j] = m[j + i];
        else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);

        T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
        T2 = safe_add(Sigma0256(a), Maj(a, b, c));

        h = g;
        g = f;
        f = e;
        e = safe_add(d, T1);
        d = c;
        c = b;
        b = a;
        a = safe_add(T1, T2);
      }

      HASH[0] = safe_add(a, HASH[0]);
      HASH[1] = safe_add(b, HASH[1]);
      HASH[2] = safe_add(c, HASH[2]);
      HASH[3] = safe_add(d, HASH[3]);
      HASH[4] = safe_add(e, HASH[4]);
      HASH[5] = safe_add(f, HASH[5]);
      HASH[6] = safe_add(g, HASH[6]);
      HASH[7] = safe_add(h, HASH[7]);
    }
    return HASH;
  }

  function str2binb (str) {
    var bin = Array();
    var mask = (1 << chrsz) - 1;
    for(var i = 0; i < str.length * chrsz; i += chrsz) {
      bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
    }
    return bin;
  }

  function Utf8Encode(string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }

    return utftext;
  }

  function binb2hex (binarray) {
    var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var str = "";
    for(var i = 0; i < binarray.length * 4; i++) {
      str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
      hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
    }
    return str;
  }

  s = Utf8Encode(s);
  return binb2hex(core_sha256(str2binb(s), s.length * chrsz));

};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

hub.buzhash = function(s) {
  // FIXME: Write me!
  return 0 ;
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

// FIXME: File has bad names, use a string split below and hide private vars!
// FIXME: Who originaly wrote this? Verify the license.
hub.base64chars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"] ;
hub.base64inv = {
  0: 52, 1: 53, 2: 54, 3: 55, 4: 56, 5: 57, 6: 58, 7: 59, 8: 60, 9: 61,
  '+': 62, '/': 63,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15,
  Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
  a: 26, b: 27, c: 28, d: 29, e: 30, f: 31, g: 32, h: 33, i: 34, j: 35, k: 36, l: 37, m: 38, n: 39,
  o: 40, p: 41, q: 42, r: 43, s: 44, t: 45, u: 46, v: 47, w: 48, x: 49, y: 50, z: 51
};

hub.base64_encode = function(s)
{
  // the result/encoded string, the padding string, and the pad count
  var base64chars = hub.base64chars,
      r = "",
      p = "",
      c = s.length % 3;
 
  // add a right zero pad to make this string a multiple of 3 characters
  if (c > 0) { 
    for (; c < 3; c++) { 
      p += '='; 
      s += "\0"; 
    } 
  }
 
  // increment over the length of the string, three characters at a time
  for (c = 0; c < s.length; c += 3) {
 
    // we add newlines after every 76 output characters, according to the MIME specs
    if (c > 0 && (c / 3 * 4) % 76 == 0) { 
      r += "\r\n"; 
    }
 
    // these three 8-bit (ASCII) characters become one 24-bit number
    var n = (s.charCodeAt(c) << 16) + (s.charCodeAt(c+1) << 8) + s.charCodeAt(c+2);
 
    // this 24-bit number gets separated into four 6-bit numbers
    n = [(n >>> 18) & 63, (n >>> 12) & 63, (n >>> 6) & 63, n & 63];
 
    // those four 6-bit numbers are used as indices into the base64 character list
    r += base64chars[n[0]] + base64chars[n[1]] + base64chars[n[2]] + base64chars[n[3]];
  }
   // add the actual padding string, after removing the zero pad
  return r.substring(0, r.length - p.length) + p;
} ;

hub.base64_decode = function(s)
{
  var base64inv = hub.base64inv,
      base64chars = hub.base64chars ;
  // remove/ignore any characters not in the base64 characters list
  //  or the pad character -- particularly newlines
  s = s.replace(new RegExp('[^'+base64chars.join("")+'=]', 'g'), "");
 
  // replace any incoming padding with a zero pad (the 'A' character is zero)
  var p = (s.charAt(s.length-1) == '=' ? 
          (s.charAt(s.length-2) == '=' ? 'AA' : 'A') : ""); 
  var r = ""; 
  s = s.substr(0, s.length - p.length) + p;
 
  // increment over the length of this encrypted string, four characters at a time
  for (var c = 0; c < s.length; c += 4) {
 
    // each of these four characters represents a 6-bit index in the base64 characters list
    //  which, when concatenated, will give the 24-bit number for the original 3 characters
    var n = (base64inv[s.charAt(c)] << 18) + (base64inv[s.charAt(c+1)] << 12) +
            (base64inv[s.charAt(c+2)] << 6) + base64inv[s.charAt(c+3)];
 
    // split the 24-bit number into the original three 8-bit (ASCII) characters
    r += String.fromCharCode((n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  }
   // remove any zero pad that was added to make this a multiple of 24 bits
  return r.substring(0, r.length - p.length);
};
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub google Gears */

/**
  hub.Database wraps a SQLite database of serving as a backing store for the 
  data and indices of a hub.Hub object.   Uses the proposed HTML 5 SQLite API 
  when available and attempts to access Google Gears as a fallback.
  
  @class
  @extends hub.Object
*/
hub.Database = hub.Object.extend(
  /** @scope hub.Database */ {
  
  
  
});
  // ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub hub_precondition hub_error google Gears */

// FIXME: Code is not using proper prefixes in private properties and methods.
// FIXME: Code does not parse with the PEG grammar!

/**
  @class
  @extends hub.Store
*/
hub.Hub = hub.Store.extend(
/** @scope hub.Store.prototype */
{
  
  /** Walk like a duck. */
  isHub: true,
  
  // Store the most current metadata for the records in the store.
  metaData: {},

  hasSocket: false,

  currentCommit: null,
  checkingOut: null,
  currentCommitId: 0,
  commitKeys: hub.CoreSet.create(),
  commitIdsByKey: {},

  hubKeys: [],
  hubsByKey: {},

  nextCommitId: function() {
    return ++this.currentCommitId ;
  },

  /** 
    A Hash of Record Instances in the form of recordType: [dataKey, dataKey]
    i.e.:
    {
      "App.Task": {
        "0982134098",
        "8721349877"
      }
    }
  */
  _keysByType: {},
  _recordsByKey: {},
  _types: [],
  _sourceByType: {},

  uti: "com.sprouthub.app",
  _hub: {
    name: null,
    key: null,
    head: null,
    setup: false,
    db: null
  },

  /**
    States:
    0: waiting
    1: reading store
    2: writing Records
      a: waiting
      b: running SQL 
      c: error
    3: cleaning up
    4: checking out
    5: sending Pack
    6: setting up
  */
  state: 0,
  dbState: "a",
  goState: function(newState) {
    hub.debug(hub.fmt("Going to state: %@", newState)) ;
    this.state = newState ;
  },
  goDbState: function(newState) {
    hub.debug(hub.fmt("Going to DB state: %@", newState)) ;
    this.dbState = newState ;
  },

  // ..........................................................
  // DELEGATE SUPPORT
  // 
  /**
    Delegate used to implement fine-grained control over merging, and conflict 
    resolution.
    
    You can assign a delegate object to this property that will be consulted
    for various decisions regarding merging of 'commits', and the confolicts that
    may arise. The object you place here may implement some or all of
    the methods in hub.MergeDelegateProtocol.
    
    @type {hub.MergeDelegateProtocol}
  */
  delegate: null,

  // ..........................................................
  // Store Functions
  //
  addPack: function(pack, version) {
    hub_precondition(this.kindOf(hub.Hub));
    this.receivePack.call(this, pack, {
      version: version,
      dataSource: this,
      doCheckout: true,
      isInternal: true
    });
  },
  hasCommit: function(version) {
    // return this.commitKeys.contains(version);
    return !! this.commitIdsByKey[version];
  },
  extraKeys: function(remoteKeys) {
    var ourKeys = this.commitKeys.clone();
    ourKeys.removeEach(remoteKeys);
    return ourKeys; // This is now a list of keys that we have, and the server dosn't
  },
  // before commit change, get new storekeys.
  /**
    Committing Records is all or nothing, we don't need keys or ids.
  */
  commitRecords: function(recordTypes, ids, storeKeys, params) {
    var statuses = this.statuses,
    len = statuses.length,
    K = hub.Record,
    S = hub.Store,
    oldKeys = [],
    idx,
    ret,
    storeKey;
    recordTypes = [];
    storeKeys = [];

    for (storeKey in statuses) {
      storeKey = parseInt(storeKey, 10); // FIXME! ... I shouldn't have to parseInt
      hub_precondition(typeof storeKey === hub.T_NUMBER);
      // collect status and process
      status = statuses[storeKey];

      if ((status == K.EMPTY) || (status == K.ERROR)) {
        throw K.NOT_FOUND_ERROR;
      }
      else {
        if (status == K.READY_CLEAN) {
          storeKeys.push(storeKey);
          recordTypes.push(S.recordTypeFor(storeKey));
          this.writeStatus(storeKey, K.BUSY_COMMITTING);
          this.dataHashDidChange(storeKey, null, true);

        } else if (status == K.READY_NEW) {
          this.writeStatus(storeKey, K.BUSY_CREATING);
          this.dataHashDidChange(storeKey, null, true);
          storeKeys.push(storeKey);
          recordTypes.push(S.recordTypeFor(storeKey));

        } else if (status == K.READY_DIRTY) {
          // We need to make a new store key, for the changed data.
          var newKey = this.changeStoreKey(storeKey);
          this.writeStatus(newKey, K.BUSY_COMMITTING);
          this.dataHashDidChange(newKey, null, true);
          storeKeys.push(newKey);
          oldKeys.push(storeKey);
          var rt = S.recordTypeFor(storeKey);
          if (rt) recordTypes.push(rt);

        } else if (status & K.DESTROYED) {
          this.writeStatus(storeKey, K.BUSY_DESTROYING);
          this.dataHashDidChange(storeKey, null, true);
          // We don't need to do anything, so just kill it.
          this.dataSourceDidDestroy(storeKey);

        }
        // ignore K.READY_CLEAN, K.BUSY_LOADING, K.BUSY_CREATING, K.BUSY_COMMITTING, 
        // K.BUSY_REFRESH_CLEAN, K_BUSY_REFRESH_DIRTY, KBUSY_DESTROYING
      }

    }
    if (storeKeys.length > 0) {

      var set = hub.CoreSet.create([storeKey]);
      set.addEach(oldKeys);
      this._hub_notifyRecordArrays(set, hub.CoreSet.create(recordTypes));

      ret = this._hub_commitRecords(storeKeys, params);
    }
    //remove all commited changes from changelog
    if (ret) {
      this.changelog = null;
    }
    return ret;
  },
  _hub_commitRecords: function(keys, params) {
    if (!this._hub.key) {
      this._hub.key = hub.uuid();
      this.ensureHubName();
    }
    if (this.state !== 0) {
      hub_error();
      alert("Data Source is Busy, please save again later.");
      return false;
    }
    var self = this;
    self.goState(1);
    // Update and create are the same for us.
    // self.addRecords(store, keys);
    self.addRecords.call(self, keys, self.nextCommitId());

    return true;
  },

  changeStoreKey: function(storeKey, newKey) {
    hub_precondition(typeof storeKey === hub.T_NUMBER);
    var S = hub.Store;
    if (!newKey) {
      newKey = S.generateStoreKey();
    }
    hub_precondition(typeof newKey === hub.T_NUMBER);

    var recordType = this.recordTypeFor(storeKey),
    recordId = this.idFor(storeKey),
    dataHash = this.readDataHash(storeKey),
    storeKeysById = recordType.storeKeysById(); // TODO: make this faster.
    this.removeRecord(storeKey);
    storeKeysById[recordId] = newKey;
    S.idsByStoreKey[newKey] = recordId;
    S.recordTypesByStoreKey[newKey] = recordType;
    this.writeDataHash(newKey, dataHash, hub.Record.BUSY_COMMITTING); // TODO: is this right?
    this.dataHashDidChange(newKey);
    return newKey;
  },

  removeRecord: function(storeKey, recordType, opts) {
    if (!recordType) recordType = this.recordTypeFor(storeKey);
    var S = hub.Store,
    recordId = this.idFor(storeKey),
    storeKeysById = recordType.storeKeysById();
    if (opts && opts.recordChange && this.changedRecords) { // we are in a nestedHub and need to record.
      this.changedRecords.add(recordId); // So, lets record what has changed.
      this.changesById[recordId] = recordType.DESTROYED; // and how it was changed.
    }
    this.removeDataHash(storeKey, recordType.DESTROYED_CLEAN);
    this.dataHashDidChange(storeKey, null, true);
    delete storeKeysById[recordId];
    delete S.idsByStoreKey[storeKey];
    delete S.recordTypesByStoreKey[storeKey];
    // delete this.statuses[storeKey];
    delete this.revisions[storeKey];
    delete this.editables[storeKey];
    delete this.metaData[recordId];
  },

  // On start up, set next storeKey to max.
  // Call: dataSource.getMaxStoreId(this);
  init: function(uti, params) {
    arguments.callee.base.apply(this, arguments);
    this.startUp();
  },
  from: function() {
    hub_error("DEPRECATED: from is not supported on a hub");
  },
  _getDataSource: function() {
    hub.debug("DEPRECATED: _getDataSource is not supported on a hub");
    hub_precondition(this.kindOf(hub.Hub));
    return this;
  },

  setMaxStoreKey: function(maxStoreKey) {
    hub.debug(hub.fmt('VersionedStore.setMaxStoreKey to %@', maxStoreKey));
    hub.Store.prototype.nextStoreIndex = maxStoreKey;
    hub.Store.nextStoreKey = maxStoreKey;
  },

  isClean: function() {
    hub.debug('VersionedStore.setMaxStoreKey');
    if (!this.statuses) return true; // Status is empty, meaning we are clean
    var len = this.statuses.length;

    while (len--) {
      var status = this.statuses[len];
      // if we find anything other than READY_CLEAN or EMPTY, return false.
      if (! ((status & hub.Record.READY_CLEAN) || (status & hub.Record.EMPTY))) return false;
    }
    return true;
  },

  /**
    DataStore Functions
  */

  addRecords: function(keys, commit_id) {
    if (this.state !== 1) {
      alert("Attempting to add Records while in wrong state (" + this.state + ")");
      return false;
    }
    keys.sort(); // Make sure they are in order
    var i = keys.length,
    self = this,
    // FIXME: This should reference a User and Device object
    currentTask = "foo", // hub.get('currentTask'),
    currentActor = "bar", // hub.get('currentActor'),
    currentTime = new Date().getTime(),
    totalStorage = 0;
    // Loop through our records creating new 
    while (i--) {
      var storeKey = parseInt(keys[i], 10),
      recordType = self.recordTypeFor(storeKey),
      pkName = recordType.prototype.primaryKey,
      dataHash = self.readDataHash(storeKey),
      recordId = dataHash[pkName],
      pk;
      if (hub.empty(recordId)) {
        recordId = hub.uuid();
        dataHash[pkName] = recordId;
      }
      var json = JSON.stringify(dataHash),
      props = {
        storeKey: storeKey,
        recordType: recordType,
        recordId: recordId,
        dataHash: dataHash,
        bytes: json,
        storage: json.length,
        key: hub.SHA256(json),
        recordTypeName: recordType.recordTypeName,
        created_on: currentTime
      };
      if (!this._keysByType[props.recordTypeName]) {
        this._keysByType[props.recordTypeName] = [];
        this._types.push(props.recordTypeName);
      }
      this._keysByType[props.recordTypeName].push(props.key);
      this._recordsByKey[props.key] = props;
    }

    var store_bytes = JSON.stringify("store"),
    store_key,
    store_time = currentTime,
    insert_data_sql = self.insertSQL['Data']; // 7
    // It's time to insert the data
    hub.debug("* addRecords");
    this.sendToDB(function(tx) {
      self.goState(2);
      var typeMetaKeys = [],
      typeMetaByKey = {};
      // Then Types Types
      self._types.forEach(function(type) {
        var type_bytes = JSON.stringify(type),
        type_time = currentTime,
        childMetaDataKeys = [],
        metaDataByKey = {};

        // Walk through each instance
        self._keysByType[type].forEach(function(instanceKey) {
          var data = self._recordsByKey[instanceKey];
          // hub.debug(hub.fmt("saving data for: %@", data.storeKey));
          tx.executeSql(insert_data_sql, [data.key, data.created_on, data.storage, data.bytes, 0, data.storeKey, commit_id],
          function() {
            // hub.debug(hub.fmt("Saved instance data entry %@", data.key));
          },
          function(tx, error) {
            // hub.debug("Error saving data entry 144");
            hub.debug(error);
          });
          var meta_data, ret, instkey;
          // Generate first pass key and store data
          ret = self.metaData[data.recordId];
          if (!ret) {
            ret = {
              name: data.recordId,
              meta_uti: "com.hub.link",
              meta_creator: currentTask,
              meta_editor: "",
              target_uti: "com.hub.instance",
              target_creator: currentTask,
              target_editor: "",
              target_position: -1,
              data: ''
            };
            self.metaData[data.recordId] = ret;
          } else {
            ret.meta_editor = currentTask;
            ret.target_editor = currentTask;
          }
          ret.commit_id = commit_id;
          ret.target = data.key;
          ret.source = type;
          ret.storage = data.storage;

          instkey = self.getMetaDataKey(ret);
          childMetaDataKeys.push(instkey);
          metaDataByKey[instkey] = ret;
          totalStorage += data.storage;
          self.dataSourceDidComplete(data.storeKey, null, data.recordId);
        }); // end each instance
        // Add The Record Type.
        var type_key = hub.SHA256("" + type_bytes + childMetaDataKeys.sort().join(""));
        tx.executeSql(insert_data_sql, [type_key, type_time, 0, type_bytes, 1, null, commit_id],
        function() {
          // hub.debug(hub.fmt("Saved type data entry %@", type_key));
        },
        function(tx, error) {
          // hub.debug("Error saving type data entry");
          hub.debug(error);
        });
        // Get info for Link between Store and Record Type
        var tmData = self.metaData[type];
        if (!tmData) {
          tmData = {
            name: type,
            meta_uti: "com.hub.link",
            meta_creator: currentTask,
            meta_editor: "",
            target_uti: "com.hub.record",
            target_creator: currentTask,
            target_editor: "",
            target_position: -1,
            storage: 0,
            data: null
          };
          self.metaData[type] = tmData;
        } else {
          tmData.meta_editor = currentTask;
          tmData.target_editor = currentTask;
        }
        tmData.commit_id = commit_id;
        tmData.source = store_key;
        tmData.target = type_key;

        var tmKey = self.getMetaDataKey(tmData);
        typeMetaKeys.push(tmKey);
        typeMetaByKey[tmKey] = tmData;

        var mi = childMetaDataKeys.length;
        while (mi--) {
          var mdata = metaDataByKey[childMetaDataKeys[mi]];
          mdata.source = type_key;
          self.addMetaData.call(self, tx, mdata);
        }

      }); // end each type
      // Now create the Store
      store_key = hub.SHA256("" + store_bytes + typeMetaKeys.sort().join(""));
      tx.executeSql(insert_data_sql, [store_key, store_time, store_bytes.length, store_bytes, 0, null, commit_id],
      function() {
        // hub.debug(hub.fmt("Saved store data entry %@", type_key));
      },
      function(tx, error) {
        // hub.debug("Error saving store data entry");
        hub.debug(error);
      });

      var ti = typeMetaKeys.length;
      while (ti--) {
        var tdata = typeMetaByKey[typeMetaKeys[ti]];
        tdata.source = store_key;
        self.addMetaData.call(self, tx, tdata);
      }

      // Add the commit.
      self.addCommit.call(self, tx, {
        name: "commit",
        meta_uti: "com.hub.commit",
        meta_creator: currentTask,
        meta_editor: currentTask,
        merger: currentTask,
        created_on: currentTime,
        totalStorage: totalStorage,
        commit_storage: 0,
        history_storage: 0,
        data: store_key,
        meta_data: null,
        committer: currentActor,
        commit_id: commit_id
      });
      // hub.debug("Commit'd!");
      tx.executeSql("UPDATE data SET metadata_count = (SELECT COUNT(*) FROM meta_data where target = data.key)", [], undefined, self._error);

    },
    null,
    function() { // Run when Send to db is finished.
      self.goState(3);
      self.cleanup();
    },
    true // true = this is an internal call.
    ); // end sendToDB
  },

  addCommit: function(tx, p) {
    hub.debug('addCommit');
    if (this.state !== 2) {
      alert("Add Commit called with wrong state: (" + this.state + ")");
      return false;
    }
    hub_precondition(hub.typeOf(p.commit_id) === hub.T_NUMBER);
    var self = this,
    totalStorage = p.totalStorage,
    ancestors = JSON.stringify(p.ancestors ? p.ancestors: [this.currentCommit]),
    ancestorCount = ancestors.length,
    key = hub.SHA256("" + p.name + p.committer + p.data),
    insertCommitSql = self.insertSQL['Commit'];

    var insertCommitValues = [key, p.name, p.commit_id, p.meta_uti, p.meta_creator, p.meta_editor, // 6
    p.merger, p.created_on, ancestorCount, totalStorage, p.commit_storage, // 5
    p.history_storage, p.data, p.meta_data, p.committer, ancestors]; // 5 = 16
    this.set('currentCommit', key);
    this.commitKeys.add(key);
    this.commitIdsByKey[key] = p.commit_id;

    // Write to hub metadata
    hub.debug("* addCommit");
    self.sendToDB(function(tx) {

      self.ensureHubName.call(self);

      var hubName = self._hub.name,
      hubKey = self._hub.key,
      insertHubCommitSql = self.insertSQL['HubCommit'],
      insertHubCommitValues = [hubKey, key],
      updateSql = "UPDATE hub SET head = ?, name = ? WHERE key = ?",
      updateValues = [key, hubName, hubKey];

      tx.executeSql(updateSql, updateValues,
      function(tx, res) {},
      self._error);

      tx.executeSql(insertHubCommitSql, insertHubCommitValues,
      function(tx, res) {},
      self._error);
      self._hub.head = key;

    },
    null, null, true, true); // sendToDB('hub')
    tx.executeSql(insertCommitSql, insertCommitValues,
    function(tx, res) {
      // success
      hub.debug("Added Commit");
      self.sendPack.call(self, key, p.commit_id);
    },
    self._error);
  },

  addMetaData: function(tx, params) {
    hub.debug("addMetaData");
    var self = this;
    if (self.state !== 2) {
      alert("Add MetaData called with wrong state: (" + self.state + ")");
      return false;
    }
    if (params.name === undefined || params.name === "") {
      throw ("I think you have forgotten to give your model a name.\n" + "Please make sure that you have this in each of your models:\n" + "hub.mixin(App.Model,{modelClass: 'App.Model'});");
    }
    var storage = (params.data ? params.data.length + params.storage: params.storage),
    key = self.getMetaDataKey(params, true),
    find_sql = "SELECT count(*) as count FROM meta_data WHERE key = ?",
    sql = self.insertSQL['MetaData'],
    // 14
    p = [key, params.name, params.meta_uti, params.meta_creator, // 4
    params.meta_editor, params.target_uti, params.target_creator, // 3
    params.target_editor, params.target_position, // 2
    storage, params.source, params.target, params.data, params.commit_id]; //4 = 14
    // hub.debug(sql);
    // hub.debug(p);
    tx.executeSql(sql, p,
    function(tx, res) {
      hub.debug("MetaData Added");
    },
    function(tx, err) {
      // hub.debug("Error inserting metaData");
      hub.debug(err);
    });
    return {
      storage: storage,
      key: key
    };
  },
  getMetaDataKey: function(params, secondPass) {
    var string = "" + params.name + params.meta_uti + params.meta_creator + params.meta_editor + params.target_uti + params.target_creator + params.target_editor + params.target_position + params.target + params.data;
    if (secondPass) string += params.source;
    return hub.SHA256(string);
  },
  cleanup: function() {
    this._keysByType = {};
    this._recordsByKey = {};
    this._types = [];
    this._sourceByType = {};
    this.goState(0); // finish up.
  },

  // Fetch is called when the store wants bulk data.
  fetch: function(query) {
    // pull out store (join data to meta data)
    // pull out related record types
    // pull out instances.
  },

  _sendPackURL: '/packs/?pk=%@',
  _receivePackURL: '/packs/?pk=%@',

  sendPack: function(version, commit_id) {
    var state = this.state;
    // if (state !== 0 && state !== 2) {
    //   hub.debug(hub.fmt("Can't push to server in this state (%@)", state));
    //   alert(hub.fmt("Can't push to server in this state (%@)", state));
    //   return false;
    // }
    if (hub.OfflineMode) {
      hub.debug("Offline mode, no data is being sent");
      this.goState(0);
      return;
    }
    if (!commit_id) commit_id = this.commitIdsByKey[version];
    hub.debug(hub.fmt("Preparing Pack ... %@ : %@", version, commit_id));
    hub_precondition(hub.typeOf(commit_id) === hub.T_NUMBER);
    this.goState(5);
    var self = this;
    hub.debug("* sendPack");
    self.sendToDB(function(tx) {
      var pack = [],
      toAdd = {};
      tx.executeSql("SELECT * FROM data WHERE commit_id = ?", [commit_id],
      function(tx, result) {
        var i = result.rows.length,
        row, item, key, data;
        while (i--) {
          row = result.rows.item(i);
          key = row.key;
          data = {
            metadata_count: row.metadata_count,
            storage: parseInt(row.storage, 10),
            created_on: parseInt(row.created_on, 10),
            bytes: row.bytes
          };
          item = {
            "pk": key,
            "model": "Data",
            "fields": data
          };
          hub.debug(hub.inspect(item.fields));
          pack.push(item);
        }
        toAdd["data"] = true;
        self._sendPack.call(self, version, pack, toAdd);
      });
      tx.executeSql("SELECT * FROM meta_data WHERE commit_id = ?", [commit_id],
      function(tx, result) {
        var j = result.rows.length,
        row, item, key;
        while (j--) {
          row = result.rows.item(j);
          key = row.key;
          delete row.key;
          delete row.commit_id;
          item = {
            "pk": key,
            "model": "MetaData",
            "fields": row
          };
          pack.push(item);
        }
        toAdd["metaData"] = true;
        self._sendPack.call(self, version, pack, toAdd);
      });
      hub.debug(hub.fmt("Finding commit with id: %@", commit_id));
      tx.executeSql("SELECT * FROM commits WHERE commit_id = ?", [commit_id],
      function(tx, result) {
        var row = result.rows.item(0),
        key = row.key,
        data;
        data = hub.clone(row);
        delete data.key;
        delete data.commit_id;
        data.created_on = parseInt(data.created_on, 10);
        var item = {
          "pk": key,
          "model": "Commit",
          "fields": data
        };
        pack.push(item);
        toAdd["commit"] = true;
        self._sendPack.call(self, version, pack, toAdd);
      });
    });
    this.goState(0);

  },
  _sendPack: function(version, pack, toAdd) {
    if (toAdd.data && toAdd.metaData && toAdd.commit) {
      var dataHash = pack,
      url = hub.fmt(this._sendPackURL, version);
      hub.debug("Calling packCommited call back");
      // if (this.get('hasSocket')) { // Send Via Socket if we have one.
      //   SproutDB.webSocket.send(version+":"+JSON.stringify(pack)) ;
      // } else { // Else send via ajax.
      //   hub.Request.postUrl(url).set('isJSON', true)
      //     .notify(this, this._didSendPack, {
      //       version: version
      //     }).send(dataHash) ;
      // }
      this.packCommitted(version, pack);
    } else {
      hub.debug("Not yet sending pack.");
    }
  },
  packCommitted: function(version, pack) {
    hub.debug("No callback has been created for commits. " + "To be notified of commits assign a callback packCommitted(commitId, packData)");
  },
  // _didSendPack: function(request, params) {
  //   var response  = request.get('response') ;
  //   if (hub.ok(response)) {
  //     hub.debug('sendPack Success!') ;
  //   } else {
  //     hub.debug("sendPack FAILED!") ;
  //   }
  // },
  getPack: function(version, doCheckout) {
    var self = this,
    url = hub.fmt(this._receivePackURL, version);
    if (!doCheckout) doCheckout = false;
    hub.Request.getUrl(url).set('isJSON', true).notify(this, this.receivePack, {
      version: version,
      dataSource: self,
      doCheckout: doCheckout
    }).send();
  },
  receivePack: function(request, params) {
    var self = params.dataSource,
    version = params.version,
    commit_id = self.commitIdsByKey[version];
    if (commit_id) {
      hub.debug(hub.fmt("Already have commit %@:%@", version, commit_id));
      return;
    }
    self.goState(2); // Start writing records
    var doCheckout = params.doCheckout,
    pack = params.isInternal ? request: request.get('response'),
    insertSQL = self.insertSQL,
    i = pack.length,
    item,
    sql,
    values,
    data;
    commit_id = self.nextCommitId();

    hub.debug("* receivePack");
    self.sendToDB.call(self,
    function(tx) {
      while (i--) {
        item = pack[i];
        data = item.fields;
        sql = insertSQL[item.model];

        switch (item.model) {
        case 'Data':
          values = [
          item.pk, new Date(data.created_on).getTime(), data.storage, data.bytes, data.metadata_count, hub.Store.generateStoreKey(), commit_id];
          break;

        case 'MetaData':
          values = [item.pk, data.name, data.meta_uti, data.meta_creator, data.meta_editor, data.target_uti, data.target_creator, data.target_editor, data.target_position, data.storage, data.source, data.target, data.data_key, commit_id];
          break;

        case 'Commit':
          values = [item.pk, data.name, commit_id, data.commit_uti, // 4
          data.commit_creator, data.commit_editor, data.merger, // 3
          new Date(data.created_on).getTime(), data.ancestor_count, data.total_storage, //3
          data.commit_storage, data.history_storage, data.data_key, // 3
          data.commit_data, data.committer, // 3
          data.ancestors]; // 1
          break;
        }

        tx.executeSql(sql, values, undefined,
        function(tx, err) {
          hub.debug(err);
          hub.debug(sql);
          hub.debug(values);
        });
      }
    },
    null,
    function() {
      self.commitKeys.add(version);
      self.commitIdsByKey[version] = commit_id;
      self.goState(0);
      if (doCheckout) {
        hub.debug("Checking out after sync");
        self._hub.head = version; // TODO: remove this, and setup mergeing properly. This is just for the demo.
        self.checkoutLatest.call(self);
      } else {
        hub.debug("Not checking out just yet");
      }
      // self.applyCommits(version);
    },
    true);

  },

  applyCommits: function(version) {
    // check if this commit is part of this hub, if not, just return.
    if (!this.commitKeys.contains(version)) {
      return;
    }

    // 1. freeze any active references/branches/nested stores during the merge
    var nestedStores = this.get('nestedStores'),
    loc1 = nestedStores ? nestedStores.get('length') : 0,
    loc2 = loc1;
    while (loc1--) {
      nestedStores[loc1].freeze();
    }

    // 2. find the least-common-ancestor of the commit that came in and the root store
    var lca = "",
    current = this.get('currentCommit'); // TODO: fine lca
    // 3. rollback the root store to the LCA
    this.checkout(lca);

    // 4. create nested store A and apply, in order, any local commits
    var storeA = this.createEditingContext({}, hub.MergeHub);
    storeA.goTo(current);

    // 5. create nested store B and apply, in order, whatever commits came in on the push after the LCA commit that is now the root store
    var storeB = this.createEditingContext({}, hub.MergeHub);
    storeB.goTo(version);

    // 6. call Hub.merge(storeA, storeB) to merge the two stores down into the root store (making a new commit – be sure to record the commit ancestors properly)
    this.merge(storeA, storeB);

    // 7. destroy the two nested stores you just created
    storeA.destroy();
    storeB.destroy();

    // 8. unfreeze the nested stores you froze in step 1
    while (loc2--) {
      nestedStores[loc2].unfreeze();
    }
  },

  merge: function(storeA, storeB) {
    var self = this,
    delegate = this.delegate;
    if (delegate && delegate.hubDidStartMerge) delegate.hubDidStartMerge(self, storeA, storeB);
    storeA.changedRecords.forEach(function(recordId) {
      if (storeB.changedRecords.contains(recordId)) {
        if (delegate && delegate.hubDidHaveConflict) {
          delegate.hubDidHaveConflict(storeA, storeB, recordId);
        }
      }
    });
  },

  /** @private Default implementation of delegate method. */
  hubDidHaveConflict: function(head1, head2, recordId) {
    var K = hub.Record;
    // if one is destroyed, automatically choose the other.
    var record1 = head1.idFor(),
    record2 = head2.idFor();
    if (head1.readStatus(record1) & K.DESTROYED) return head2.readDataHash(record2);
    if (head2.readStatus(record2) & K.DESTROYED) return head1.readDataHash(record1);

    // Else newest wins.
    if (head1.created_on > head2.created_on) {
      return head1.readDataHash(record1);
    } else {
      return head2.readDataHash(record2);
    }
  },

  retrieveRecord: function(storeKey, id) {
    hub.debug("* retrieveRecord");
    this.sendToDB(function(tx) {
      tx.executeSql("SELECT * FROM data WHERE store_key = ?", [storeKey],
      function(tx, result) {
        if (result.rows.length > 0) {
          var row = result.rows.item(0),
          record = JSON.parse(row['bytes']);
          // Bonsai.debug['row'] = row;
          self.dataSourceDidComplete(storeKey, record);
        } else {
          hub_error();
        }
      },
      function(tx, error) {
        self.dataSourceDidError(storeKey, error);
      });
    });
  },

  packListUrl: "/packs/keys/",
  sync: function() {
    var self = this;
    // get list of remote commits.
    hub.Request.getUrl(self.packListUrl).set('isJSON', true).notify(this, this._didGetPackList, {
      dataSource: self
    }).send();
  },
  _didGetPackList: function(request, params) {
    // Local commits: self.commitKeys {hub.CoreSet}
    var self = params.dataSource,
    localKeys = this.commitKeys,
    remoteKeys = hub.CoreSet.create(request.get('response')),
    // figure out which need to go up
    // and which need to go down.
    toPush = localKeys.copy().removeEach(remoteKeys),
    toPull = remoteKeys.copy().removeEach(localKeys),
    pullLen = toPull.length - 1;
    // pull
    toPull.forEach(function(version, idx) {
      hub.debug(hub.fmt("  Getting Pack: %@", version));
      if (idx === pullLen) {
        hub.debug(hub.fmt(" ### get pack %@ of %@", idx, pullLen));
        self.getPack.call(self, version, true);
      } else {
        hub.debug(hub.fmt(" ## get pack %@ of %@", idx, pullLen));
        self.getPack.call(self, version);
      }
    });
    // push
    toPush.forEach(function(version) {
      var cid = self.commitIdsByKey[version];
      hub.debug(hub.fmt("  Sending Pack: %@ - %@", version, cid));
      self.sendPack.call(self, version, cid);
      hub.debug("... sent!");
    });
    // checkout latest ?
    // self.invokeLater('checkoutLatest', 800, store);
  },

  openHubDialog: function(viewFun) {
    var self = this;
    this.sendToDB(function(tx) {
      var sql = "SELECT * FROM hubs WHERE meta_uti = ?";
      tx.executeSql(sql, [self.get('uti')],
      function(tx, res) {
        var i = res.rows.length,
        row, hub, hubs = [];
        while (i--) {
          row = res.rows.item(i);
          hubs.unshift({
            key: row['key'],
            name: row['name']
          });
          viewFun(hubs);
        }
      },
      self._error);
    },
    null, null, true, true);
  },
  openHub: function(hubKey, hubName) {
    this._hub = {
      key: hubKey,
      name: hubName,
      head: null,
      setup: false,
      db: null
    };
    this.checkoutLatest();
  },

  saveAsDialog: function() {

},
  saveAs: function(hubKey, hubName) {
    var self = this;
    this.sendToDB(function(tx) {
      var sql = "UPDATE hub SET name = ? WHERE key = ?",
      values = [hubName, hubKey];

      tx.executeSql(sql, values,
      function(tx, res) {

},
      self._error);
    });
  },

  ensureHubName: function() {
    hub_precondition(this.kindOf && this.kindOf(hub.Hub));
    if (hub.empty(this._hub.name)) {
      var newHubName = prompt("What name do you want to save this sproutHub file as?", "MyHub");
      this._hub['name'] = newHubName ? newHubName: 'MyHub';
    }
  },

  // TODO: add forced ... at some point.
  checkout: function(version, params) {
    hub_precondition(this.kindOf && this.kindOf(hub.Hub));
    if (!version) {
      this.checkoutLatest();
      return;
    }
    if (!params) params = {};
    if (this.get('checkingOut') === version) {
      hub.debug("Already checking out this version");
      return false;
    }
    if (this.state !== 0) {
      alert("Checkout called with wrong state: (" + this.state + ")");
      return false;
    }
    if (this.get('currentCommit') === version) {
      hub.debug("Already checked out this version");
      return false;
    }
    this.set('checkingOut', version);
    this.goState(4);
    if (!this.isClean()) {
      alert('You tried to checkout while the store was not clean. Please commit changes first.');
      this.goState(0);
      return false;
    }
    var self = this,
    currentCommit = self.currentCommit,
    storeKeys = {},
    dataByKey = {},
    currentKeys = hub.CoreSet.create(),
    targetKeys = hub.CoreSet.create();

    // if (!forced) forced = false;
    // find commit
    // Not implimented yet
    // find store
    hub.debug("* checkout");
    this.sendToDB(function(tx) {
      var storeKeySql = "SELECT data.store_key, data.key, commits.key as commitKey, src_md.name as type, data.bytes" + " FROM data" + " JOIN meta_data ON (data.key = meta_data.target)" + " JOIN meta_data AS src_md ON (meta_data.source = src_md.target)" + " JOIN commits ON (commits.commit_id = src_md.commit_id)" + " WHERE data.store_key IS NOT NULL" + " AND commits.key IN (?,?)",
      storeKeyValues = [currentCommit, version];
      tx.executeSql(storeKeySql, storeKeyValues,
      function(tx, res) {
        var si = res.rows.length,
        S = hub.Store,
        K = hub.Record,
        data, recordType, recordId, storeKeysById, storeKey, opts;
        while (si--) {
          var row = res.rows.item(si),
          sKey = parseInt(row['store_key'], 10);
          if (row['commitKey'] == currentCommit) {
            currentKeys.add(sKey);
          } else {
            targetKeys.add(sKey);
          }
          dataByKey[sKey] = {
            type: row['type'],
            pk: row['key'],
            bytes: JSON.parse(row['bytes'])
          };
        }
        var toDelete = currentKeys.copy().removeEach(targetKeys),
        toCreate = targetKeys.copy().removeEach(currentKeys);

        opts = this.changedRecords ? {
          recordChange: true
        }: undefined;
        toDelete.forEach(function(storeKey) {
          hub_precondition(typeof storeKey === hub.T_NUMBER);
          // data = dataByKey[storeKey];
          self.removeRecord(storeKey, opts);
        });

        toCreate.forEach(function(storeKey) {
          hub_precondition(typeof storeKey === hub.T_NUMBER);
          data = dataByKey[storeKey];
          recordType = hub.objectForPropertyPath(data['type']);
          recordId = data.bytes[recordType.prototype.primaryKey];
          storeKeysById = recordType.storeKeysById();
          storeKeysById[recordId] = storeKey;
          S.idsByStoreKey[storeKey] = data['key'];
          S.recordTypesByStoreKey[storeKey] = recordType;
          self.writeDataHash(storeKey, data['bytes'], K.READY_CLEAN); // TODO: is this right?
          self.dataHashDidChange(storeKey);
          if (opts) { // we are in a nestedHub
            this.changedRecords.add(recordId); // So, lets record what has changed.
            this.changesById[recordId] = K.DIRTY; // and how it was changed.
          }
        });
      },
      function(tx, err) {
        hub.debug("Error in Checkout.");
        hub.debug(err);
        return false;
      });
    },
    null,
    function() {
      self.set('currentCommit', version);
      self.set('checkingOut', null);
      this.goState(0);
    },
    true);
  },
  checkoutLatest: function() {
    hub_precondition(this.kindOf(hub.Hub));
    if (!this._hub || !this._hub.head) return;
    hub_precondition(this._hub.head);
    var commit, self = this;
    hub.debug("* checkoutLatest");
    this.sendToDB(function(tx) {
      // Select the first hub that is part of this application.
      var sql = "SELECT * FROM commits WHERE key = ?";
      tx.executeSql(sql, [self._hub.head],
      function(tx, res) {
        if (res.rows.length > 0) {
          // We have a hub, so checkout the latest commit from that hub.
          var row = res.rows.item(0);
          commit = row['key'];
          self.databaseDesc = self.databaseName = row['hub_name'];
        }
      });
    },
    null,
    function() {
      if (commit) {
        hub.debug(hub.fmt("Checking out %@", commit));
        self.checkout.call(self, commit);
      } else {
        hub.debug("Found no commits to checkout.");
      }
    },
    true);
  },

  createHub: function(tx, params) {
    if (!this._hub.key) this._hub.key = hub.uuid();
    var self = this,
    insertHubSql = self.insertSQL['Hub'],
    name = (self._hub.name || "DefaultName"),
    insertHubValues = [self._hub.key, name, self.get('uti'), params.creator, params.editor || "", 0, 0, params.version, "", ""];
    self._hub.name = name;
    // TODO: Make sure this actually does stuff
    // insertHubSql = "COMMIT; BEGIN TRANSACTION; "+insertHubSql+"; COMMIT; BEGIN TRANSACTION; ";
    tx.executeSql(insertHubSql, insertHubValues,
    function(tx, res) {
      hub.debug(hub.fmt("Created Hub: %@: %@", self._hub.name, self._hub.key));
    },
    self._error);
  },

  startUp: function() {
    hub_precondition(this.kindOf(hub.Hub));
    var self = this;
    hub.debug("* startUp hub");
    self.sendToDB(function(tx) {
      tx.executeSql("SELECT * FROM hub WHERE meta_uti = ?", [self.get('uti')],
      function(tx, res) {
        if (res.rows.length > 0) {
          var row = res.rows.item(0);
          self._hub.key = row['key'];
          self._hub['name'] = row['name'];
          self._hub.head = row['head'];
          hub.debug(hub.fmt("Loading hub: %@; %@", self._hub.key, self._hub.name));
        } else {
          self.createHub.call(self, tx, {
            version: 'empty',
            creator: self.get('currentTask'),
            editor: ''
          });
        }

        tx.executeSql("SELECT * FROM hub_commit WHERE hub = ?", [self._hub.key],
        function(tx, res) {
          var i = res.rows.length,
          row;
          // hub.debug(hub.fmt("^ adding %@ commits for hub %@", i, self._hub.key)) ;
          while (i--) {
            row = res.rows.item(i);
            // hub.debug(hub.fmt("Adding commit %@", row['commit'])) ;
            self.commitKeys.add(row['commit']);
            self.commitIdsByKey[row['commit']] = parseInt(row['commit_id'], 10);
          }
          // hub.debug(self.commitKeys.toString()) ;
        },
        self._error);

      },
      self._error);

    },
    null, self.setup, true, true); // sendToDB('hub')
  },

  settingUp: false,
  setup: function() { // Run after we have done the previous
    var self = this;
    if (hub.empty(self._hub.key)) return; // we don't have a hub setup yet, so wait until we do.
    hub_precondition(!self.settingUp);
    self.settingUp = true;
    hub.debug("* startUp store");
    self.sendToDB(function(tx) {
      // Set the max storeKey for the store.
      tx.executeSql("SELECT MAX(store_key)+1 AS max FROM data", [],
      function(tx, results) {
        var max;
        try {
          max = parseInt(results.rows.item(0)['max'], 10);
        } catch(e) {
          max = 1;
        }
        if (isNaN(max)) max = 1;
        hub_precondition(typeof max === hub.T_NUMBER);
        self.setMaxStoreKey(max);
        self.checkoutLatest.call(self);
      },
      self._error);

      // Get the current max commit count.
      tx.executeSql("SELECT MAX(commit_id) as max FROM commits", [],
      function(tx, res) {
        var max = parseInt(res.rows.item(0)['max'], 10);
        if (isNaN(max)) max = 0;
        self.currentCommitId = max;
      },
      self._error);

      tx.executeSql("SELECT commit_id, key FROM commits", [],
      function(tx, res) {
        var i = res.rows.length,
        row;
        while (i--) {
          row = res.rows.item(i);
          // self.commitKeys.add(row['key']) ; // This is now done in startUp, from the hubs DB
          self.commitIdsByKey[row['key']] = parseInt(row['commit_id'], 10);
        }
      },
      self._error);
    },
    null,
    function() {
      // self.sync(store);
      self._hub.setup = true;
      self.settingUp = false;
      // TODO: Make startup Hook?
    },
    true); // sendToDB(store)
  },

  _dbs: {},
  // Holds databases for 'SproutHub' and <hubKey>
  _sqlQueue: [],
  _sqlInternalQueue: [],
  /** 
    Add State check, and only run when not touching DB.
    If not in correct state, then add to FIFO queue, and invokeLater sendToDB
  */
  sendToDB: function(func, noDB, onFinish, internal, isHub) {
    hub_precondition(this.kindOf && this.kindOf(hub.Hub)); // Make sure we are in the correct context.
    hub_precondition(this.dbState !== 'c', "Database is in error state.");
    var self = this,
    dbName, dbDesc;
    if (this.dbState === "b" || (this.state === 4 && this._sqlInternalQueue.length > 0 && !internal)) {
      if (internal) {
        this._sqlInternalQueue.push(arguments);
      } else {
        this._sqlQueue.push(arguments);
      }
      // this.invokeLast("invokeSendToDB");
      setTimeout(function() {
        self.invokeSendToDB.apply(self);
      },
      500);
      return;
    }

    this.goDbState("b");
    if (isHub) {
      dbName = "SproutHub";
      dbDesc = "SproutHub Metadata";
    } else {
      dbName = self._hub.key;
      dbDesc = dbName + " DataStore";
    }
    if (!dbName) {
      hub.debug('No Hub yet, wait till we have one.');
      self.invokeLater.apply(self);
      return;
    }
    if (!isHub && !self.settingUp && !self._hub.setup) {
      self.setup();
    }
    if (self._dbs[dbName]) {
      hub.debug("Running Query with existing database.");
      self._dbs[dbName].transaction(function(tx) {
        func(tx);
      },
      function(error) {
        self.goDbState("c");
        hub.debug("ERROR: Transaction Errored.");
        hub.debug(error);
        hub_error();
      },
      function() {
        if (onFinish) onFinish.apply(self);
        self.goDbState("a");
        self.invokeSendToDB.apply(self);
      });
    } else {
      if (noDB) {
        noDB();
        if (onFinish) onFinish.apply(self);
        self.goDbState("a");
        return self.invokeSendToDB.apply(self);
      }
      var errmsg = "Sorry, No DB today.",
      new_db = null;
      try {
        if (window.openDatabaseSync || window.openDatabase || (google.gears.factory && google.gears.factory.create)) {
          if (window.openDatabaseSync) {
            new_db = window.openDatabaseSync(dbName, "1.1", dbDesc, 5000000);
            new_db.addListener("commit",
            function() {
              hub.debug("COMMIT");
            });

            new_db.addListener("update",
            function(operation, database, table, rowid) {
              hub.debug("update " + operation + " " + database + "." + table + " " + rowid);
            });
          } else if (window.openDatabase) {
            new_db = window.openDatabase(dbName, "1.1", dbDesc, 5000000);
          } else {
            // Must be google gears
            new_db = Gears.openDatabase(dbName, "1.1");
          }
          if (!new_db) {
            alert(errmsg + " Couldn't open, maybe bad version or run out of DB quota.");
          } else {
            // We have a database, now test to see if we have a table.
            // Just just need to test for 1 table, thanks to transactions we should
            // have all or none.
            new_db.transaction(function(tx) {
              tx.executeSql(hub.fmt("SELECT COUNT(*) FROM %@", isHub ? "hub": "data"), [],
              function(tx) {
                hub.debug("We have our data tables.");
                self._dbs[dbName] = new_db;
                func(tx);
              },
              function(tx, err) {
                hub.debug("We don't have the data table ...");
                if (isHub) {
                  self._createHubTables(tx);
                } else {
                  self._createStoreTables(tx);
                }
                // tx.executeSql('COMMIT') ;
                // tx.executeSql('BEGIN TRANSACTION') ;
                func(tx);
                hub.debug('end callback');
                return false; // Let the transaction know that we handelled the error.
              });
            },
            function(error) {
              hub.debug("ERROR: Transaction Errored! " + error.message);
              self.goDbState("c");
              hub_error("transaction error");
              // self.invokeSendToDB.apply(self);
            },
            function() {
              if (onFinish) onFinish.apply(self);
              self.goDbState("a");
              self.invokeSendToDB.apply(self);
            });
          }
        } else if (window.google.factory && window.google.factory.create) {

} else {
          alert(errmsg + " Your browser doesn't support it.");
        }
      } catch(err) {
        alert(errmsg + " Something bad happened: " + err);
      }
    }
  },
  invokeCount: 0,
  invokeSendToDB: function() {
    var self = this,
    args;
    if (this.dbState === "b") {
      hub.debug("Invokeing DB later");
      self.invokeCount++;
      if (self.invokeCount < 10) {
        setTimeout(function() {
          self.invokeSendToDB.apply(self);
        },
        500);
      }
      return false;
    }
    self.invokeCount = 0;
    if (self._sqlInternalQueue.length > 0) {
      args = this._sqlInternalQueue.shift();
      return self.sendToDB.apply(self, args);
    } else if (self._sqlQueue.length > 0) {
      args = this._sqlQueue.shift();
      return self.sendToDB.apply(self, args);
    }
  },

  /*
    Generic Error callback.
  */
  _error: function(tx, e, msg) {
    hub.debug("Error!: " + msg);
    hub.debug(e);
    return false;
  },

  insertSQL: {
    "Data": "INSERT OR IGNORE INTO data (key, created_on, storage, bytes, metadata_count, store_key, commit_id) VALUES (?,?,?, ?,?,?, ?)",
    "MetaData": "INSERT OR IGNORE INTO meta_data (key, name, meta_uti, meta_creator, meta_editor, target_uti, target_creator, target_editor, target_position, storage, source, target, data_key, commit_id)" + " VALUES (?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?);",
    //14
    "Commit": "INSERT OR IGNORE INTO commits (key, name, commit_id, commit_uti, commit_creator," + // 5
    " commit_editor, merger, created_on, ancestor_count, total_storage," + // 5
    " commit_storage, history_storage, data_key, commit_data, committer," + // 5
    " ancestors)" + // 1 = 16
    " VALUES (?,?,?, ?,?,?, ?,?,?, ?,?,?, ?,?,?, ?)",
    // 16
    "Hub": "INSERT OR REPLACE INTO hub (key, name, meta_uti, meta_creator, meta_editor, is_private, is_archived, head, forked_from, meta_data)" + " VALUES (?,?,?, ?,?,?, ?,?,?, ?)",
    // 10
    "HubCommit": "INSERT OR IGNORE INTO hub_commit (hub, 'commit') VALUES (?,?)"
  },

  _createStoreTables: function(tx, error) {
    // There is no tables ... yet
    hub.debug("start creating data tables.");
    tx.executeSql("CREATE TABLE 'actor' (email TEXT, public_key TEXT)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'data' (key TEXT, store_key INTEGER, created_on TEXT, storage INTEGER, bytes BLOB, metadata_count INTEGER, commit_id INTEGER)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'meta_data' (key TEXT, name TEXT, meta_uti TEXT, meta_creator TEXT, meta_editor TEXT, target_uti TEXT, target_creator TEXT, target_editor TEXT, target_position INTEGER, storage INTEGER, source TEXT, target TEXT, data_key TEXT, commit_id INTEGER)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'commits' (key TEXT, name TEXT, commit_id INTEGER, commit_uti TEXT, commit_creator TEXT, commit_editor TEXT, merger TEXT, created_on INTEGER, ancestor_count INTEGER, total_storage INTEGER, commit_storage INTEGER, history_storage INTEGER, data_key TEXT, data_uti TEXT, data_editor TEXT, data_creator TEXT, commit_data TEXT, committer TEXT, ancestors TEXT)", [], null, this._error);
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "UniqueDataKey" ON "data" ("key");');
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "UniqueDataStoreKey" ON "data" ("store_key");');
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "UniqueCommitKey" ON "commits" ("key");');
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "UniqueMetaKey" ON "meta_data" ("key");');
  },
  
  _createHubTables: function(tx, error) {
    hub.debug("start creating hub tables.");
    tx.executeSql("CREATE TABLE 'hub' (key TEXT, name TEXT, meta_uti TEXT, meta_creator TEXT, meta_editor TEXT, is_private INTEGER, is_archived INTEGER, head TEXT, forked_from TEXT, meta_data TEXT)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'hub_commit' (hub TEXT, 'commit' TEXT)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'hub_reference' (name TEXT, meta_uti TEXT, meta_creator TEXT, meta_editor TEXT, hub TEXT, 'commit' TEXT, committer TEXT, meta_data TEXT)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'hub_committer' (is_owner TEXT, hub TEXT, committer TEXT, head TEXT)", [], null, this._error);
    tx.executeSql("CREATE TABLE 'hub_observer' (hub TEXT, observer TEXT)", [], null, this._error);
    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS "UniqueHubKey" ON "hub" ("key");');
    hub.debug("finish creating hub tables.");
  }
});
// ==========================================================================
// Project:   hub.js - cloud-friendly object graph sync
// Copyright: ©2010 Erich Ocean.
//            Portions ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licensed under an MIT license (see license.js).
// ==========================================================================
/*global hub */

/**
  During a merge, each head is represented by a MergeHub instance.
  
  MergeHubs are hub.ChildStores with additional Hub-related information, such 
  as the commit they are at, the device that made the commit, etc.
  
  You can still call MergeHub#createEditingContext() if you need an editing 
  context to work with.
  
  @class
  @extends Hub
  @extends hub.ChildStore
*/
hub.MergeHub = hub.Hub.extend(hub.ChildStore,
  /** @scope hub.MergeHub.prototype */ {
  
  changedRecords: hub.CoreSet.create(),
  changesById: {},
  
  _hub_currentCommit: null,
  
  currentCommit: function() {
    if(this._hub_currentCommit) {
      return this._hub_currentCommit ;
    } else {
      var pstore = this.get('parentStore') ;
      hub_assert(pstore && pstore.isHub) ;
      pstore.get('currentCommit') ;
    }
  }.property('_hub_currentCommit').cacheable(),
  
  goTo: function(version) {
    // var cversion = this.get('currentCommit') ;
    
    this.checkout(version) ;
    
    // select all commits between cversion and version
    // find the new storeKeys
    // apply only these changes
  }
  
});
