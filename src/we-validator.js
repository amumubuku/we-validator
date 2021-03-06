import RULES from './rules'

/**
 * 环境检测：
 */
const isWx = typeof wx !== 'undefined' && !!wx.showToast // 微信小程序
const isMy = typeof my !== 'undefined' && !!my.showToast // 支付宝小程序
const isSwan = typeof swan !== 'undefined' && !!swan.showToast // 百度智能小程序
const isTt = typeof tt !== 'undefined' && !!tt.showToast // 头条小程序
const isBrowser = typeof window !== 'undefined' && !!window.alert  // 普通浏览器


const objString = Object.prototype.toString

const isArray = Array.isArray || ((v) => objString.call(v) === '[object Array]')
const isFunction = (v) => (objString.call(v) === '[object Function]')
const isRegExp = (v) => (objString.call(v) === '[object RegExp]')

class WeValidator {

    constructor(options = {}) {
        this.options = Object.assign({}, WeValidator.defaultOptions, options)

        this.required = WeValidator.RULES.required.rule
        this._checkAllRules()
    }

    /**
     * 默认参数
     * @param {object} rules 验证字段的规则
     * @param {object} messages 验证字段错误的提示信息
     * @param {function} onMessage 错误提示显示方式
     * @param {boolean} multiCheck 是否校验多个字段
     */
    static defaultOptions = {
        rules: {},
        messages: {},
        onMessage: null,
        multiCheck: false
    }

    /**
     * 所有校验规则
     */
    static RULES = {}

    /**
     * 动态添加验证规则（全局）
     * @param {string} ruleName 规则名称
     * @param {regexp|function} ruleValue 验证规则
     */
    static addRule = function (ruleName, ruleValue) {
        WeValidator.RULES[ruleName] = ruleValue
    }

    /**
     * 验证单个字段数据
     * @param {string} ruleName 规则名称
     * @param {string} value 要验证的值
     * @param {any} param 传递的验证参数
     */
    static checkField = function (ruleName, value, param){
      let rule = WeValidator.RULES[ruleName].rule

      if(isRegExp(rule)){
        return !this.required(value) || rule.test(value)
      }

      if(isFunction(rule)){
        return rule.call(this, value, param)
      }
    }

    /**
     * 显示错误提示
     */
    _showErrorMessage(params, onMessage) {
        if(isFunction(onMessage)){
            return onMessage(params)
        }

        // 参数形式 new WeValidator({ onMessage })
        if(isFunction(this.options.onMessage)){
            return this.options.onMessage(params)
        }

        // 全局配置 WeValidator.onMessage
        if(isFunction(WeValidator.onMessage)){
            return WeValidator.onMessage(params)
        }
        
        // 微信小程序
        if(isWx) {
            return wx.showToast({
                title: params.msg,
                icon: 'none'
            })
        }
        
        // 支付宝小程序
        if(isMy){
            return my.showToast({
                content: params.msg,
                type: 'none'
            })
        }

        // 百度小程序
        if(isSwan){
          return swan.showToast({
              title: params.msg,
              icon: 'none'
          })
        }

        // 头条小程序
        if(isTt){
          return tt.showToast({
              title: params.msg,
              icon: 'none'
          })
        }

        // 浏览器端
        if(isBrowser) alert(params.msg)
    }

    /**
     * 获取错误提示内容
     */
    _getErrorMessage(ruleName, attr, param){
      let messages = this.options.messages
      let defaultMessage = WeValidator.RULES[ruleName].message

      if(messages.hasOwnProperty(attr) && messages[attr][ruleName]){
        defaultMessage = messages[attr][ruleName]
      }

      if(defaultMessage){
        defaultMessage = defaultMessage.replace(/\{(\d)\}/g, function($0, $1){
          if(isArray(param)){
            return param[$1]
          }else{
            return param
          }
        })
        
        return defaultMessage
      }
    }

    /**
     * 验证配置规则是否无效
     */
    _isRuleInvalid(ruleName, attr) {
        if (!WeValidator.RULES.hasOwnProperty(ruleName)) {
            console.warn && console.warn(`没有此验证规则：${ruleName}，字段：${attr}`)
            return true
        }
    }

    /**
     * 验证所有配置规则是否正确
     */
    _checkAllRules() {
        let _rules_ = this.options.rules

        // 遍历字段
        for (let attr in _rules_) {
            // 遍历验证规则
            for (let ruleName in _rules_[attr]) {
                if (this._isRuleInvalid(ruleName, attr)) continue
            }
        }
    }

    /**
     * 验证表单数据
     * @param {object} data 验证的数据对象
     * @param {function} onMessage 自定义错误提示函数
     * @param {boolean} showMessage 是否显示提示信息，默认显示
     */
    checkData(data, onMessage, showMessage = true) {
        let _rules_ = this.options.rules
        let multiCheck = this.options.multiCheck
        let hasError = false
        let errorData = {}

        this.data = data

        // 遍历字段
        for (let attr in _rules_) {
            // 遍历验证规则
            for (let ruleName in _rules_[attr]) {
                if (this._isRuleInvalid(ruleName, attr)) continue

                let ruleParam = _rules_[attr][ruleName]
                let value = ''

                if (data.hasOwnProperty(attr)) {
                    value = data[attr]
                }

                let param = ruleParam

                if(isFunction(ruleParam)){
                  param = ruleParam.call(this, value)
                }

                if (!WeValidator.checkField.call(this, ruleName, value, param)) {
                  // 验证不通过
                  let msg = this._getErrorMessage(ruleName, attr, param)

                  if (showMessage && msg) {
                      let errorParam = {
                          name: attr,
                          value: value,
                          param: param,
                          rule: ruleName,
                          msg: msg
                      }
                      errorData[attr] = errorParam

                      if(!multiCheck) this._showErrorMessage(errorParam, onMessage)
                  }
                  hasError = true
                  if(!multiCheck) return false
                }
            }
        }

        if(hasError){
          if(multiCheck){
            this._showErrorMessage(errorData, onMessage)
          }
          return false
        }

        return true
    }

    /**
     * 动态添加字段校验
     * @param {object} options 配置参数
     * @param {object} [options.rules] 规则
     * @param {object} [options.messages] 提示消息
     */
    addRules(options = {}) {
      Object.assign(this.options.rules, options.rules || {})
      Object.assign(this.options.messages, options.messages || {})

      this._checkAllRules()
    }

    /**
     * 动态移除字段校验
     * @param {array} fields 要删除校验的字段
     */
    removeRules(fields) {
      if(!isArray(fields)) throw new Error('参数须为数组')
      
      for(let i = 0; i < fields.length; i++){
        let key = fields[i]

        delete this.options.rules[key]
      }
    }

    /**
     * 校验数据是否有效，不提示错误信息
     * @param {object} data 验证的数据对象
     */
    isValid(data) {
      return this.checkData(data, null, false)
    }

}

WeValidator.RULES = RULES
WeValidator.required = WeValidator.RULES.required.rule

module.exports = WeValidator