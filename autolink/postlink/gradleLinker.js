// @ts-check
var path = require('./path');
var fs = require('fs');
var { warnn, errorn, logn, infon, debugn } = require('./log');
var { insertString } = require('./stringUtils');
var DEFAULT_KOTLIN_VERSION = '1.3.61';

class GradleLinker {
  constructor() {
    this.gradlePath = path.rootGradle;
  }

  link() {
    logn('Linking root build.gradle...');
    if (this.gradlePath) {
      var contents = fs.readFileSync(this.gradlePath, 'utf8');
      contents = this._setKotlinVersion(contents);
      contents = this._setKotlinPluginDependency(contents);
      fs.writeFileSync(this.gradlePath, contents);
      infon('Root build.gradle linked successfully!\n');
    } else {
      warnn('   Root build.gradle not found!');
    }
  }

  _setKotlinPluginDependency(contents) {
    if (this._isKotlinPluginDeclared(contents)) {
      warnn('   Kotlin plugin already declared')
      return contents;
    }
    var match = /classpath\s*\(*["']com\.android\.tools\.build:gradle:/.exec(contents);
    if (match) {
      debugn("   Adding Kotlin plugin");
      return insertString(contents, match.index, `classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:${DEFAULT_KOTLIN_VERSION}"\n        `);
    } else {
      errorn("   Could not add kotlin plugin dependency")
    }
    return contents;
  }

  _setKotlinVersion(contents) {
    if (this._isKotlinVersionSpecified(contents)) {
      warnn("   Kotlin version already specified");
    } else {
      var kotlinVersion = this._getKotlinVersion(contents);
      if (this._hasExtensionVariablesBlock(contents)) {
        debugn("   Adding RNNKotlinVersion to extension block");
        return contents.replace(/ext\s*{/, `ext {\n        RNNKotlinVersion = ${kotlinVersion}`);
      } else {
        debugn("   Adding RNNKotlinVersion extension variable");
        return contents.replace(/buildscript\s*{/, `buildscript {\n    ext.RNNKotlinVersion = ${kotlinVersion}`);
      }
    }
    return contents;
  }

  /**
   * @param { string } contents
   */
  _getKotlinVersion(contents) {
    var hardCodedVersion = contents.match(/(?<=kotlin-gradle-plugin:)\$*[\d\.]{3,}/);
    if (hardCodedVersion && hardCodedVersion.length > 0) {
      return `"${hardCodedVersion[0]}"`;
    }
    var extensionVariableVersion = contents.match(/(?<=kotlin-gradle-plugin:)\$*[a-zA-Z\d\.]*/);
    if (extensionVariableVersion && extensionVariableVersion.length > 0) {
      return extensionVariableVersion[0].replace("$", "");
    }
    return `"${DEFAULT_KOTLIN_VERSION}"`;
  }

  /**
   * @param {string} contents
   */
  _hasExtensionVariablesBlock(contents) {
    return /ext\s*{/.test(contents);
  }

  /**
   * @param {string} contents
   */
  _isKotlinVersionSpecified(contents) {
    return /RNNKotlinVersion/.test(contents);
  }

  /**
   * @param {string} contents
   */
  _isKotlinPluginDeclared(contents) {
    return /org.jetbrains.kotlin:kotlin-gradle-plugin:/.test(contents);
  }
}

module.exports = GradleLinker;
