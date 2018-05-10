const assert = require('assert');
const ms = require('ms');
const jwt = require('./jwt');
const bcrypt = require('./bcrypt');
const AuthError = require('./error');

function isMongooseModel(model) {
  return typeof model.findOne === 'function' &&
    typeof model.findById === 'function' &&
    typeof model.findByIdAndUpdate === 'function';
}

class Auth {
  constructor(options) {
    assert(options.secretKey, '\'secretKey\' is required');
    assert(options.userModel, '\'userModel\' is required');

    this.secretKey = options.secretKey;
    this.userModel = options.userModel;
    this.propertyMap = {
      username: 'username',
      password: 'password',
      ...(options.propertyMap || {}),
    };
  }

  async createAccessToken(params) {
    assert(params.username, '\'username\' is required');
    assert(params.password, '\'password\' is required');

    let account;
    if (isMongooseModel(this.userModel)) {
      account = await this.userModel
        .findOne({ [this.propertyMap.username]: params.username })
        .select({ password: 1 });
    } else {
      account = await this.userModel.findByUsername(params.username);
    }

    if (!account) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
      );
    }

    assert(account.id, '\'id\' is required');
    assert(account.password, '\'password\' is required');

    const valid = await bcrypt.compare(params.password, account.password);
    if (!valid) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
      );
    }

    const payload = {
      sub: account.id,
      exp: Math.floor((Date.now() + ms(params.expiresIn || '30d')) / 1000),
      ...(params.claims || {}),
    };

    return jwt.create(payload, this.secretKey);
  }

  async verifyAccessToken(params) {
    let decoded;
    try {
      decoded = await jwt.verify(params.accessToken, this.secretKey, params.subject);
    } catch (err) {
      throw new AuthError(
        'INVALID_TOKEN',
        'Invalid access token',
      );
    }

    return decoded;
  }

  async changePassword(params) {
    assert(params.accessToken, '\'accessToken\' is required');
    assert(params.oldPassword, '\'oldPassword\' is required');
    assert(params.newPassword, '\'newPassword\' is required');

    const decoded = await this.verifyAccessToken(params);

    let account;
    if (isMongooseModel(this.userModel)) {
      account = await this.userModel
        .findById(decoded.sub)
        .select({ [this.propertyMap.password]: 1 });
    } else {
      account = await this.userModel.findById(decoded.sub);
    }

    const valid = await bcrypt.compare(
      params.oldPassword,
      account[this.propertyMap.password],
    );

    if (!valid) {
      throw new AuthError(
        'INVALID_CREDENTIALS',
        'Invalid password',
      );
    }

    const password = await bcrypt.hash(params.newPassword);
    if (isMongooseModel(this.userModel)) {
      await this.userModel
        .findByIdAndUpdate(decoded.sub, { [this.propertyMap.password]: password });
    } else {
      await this.userModel.updatePassword(decoded.sub, password);
    }
  }

  async requestResetPassword(params) {
    assert(params.subject, '\'subject\' is required');

    let account;
    if (isMongooseModel(this.userModel)) {
      account = await this.userModel
        .findById(params.subject)
        .select({ _id: 1 });
    } else {
      account = await this.userModel.findById(params.subject);
    }

    if (!account) {
      throw new AuthError(
        'USER_NOT_FOUND',
        'User does not exist',
      );
    }

    const payload = {
      sub: params.subject,
      exp: Math.floor((Date.now() + ms(params.expiresIn || '12h')) / 1000),
    };

    return jwt.create(payload, this.secretKey);
  }

  async resetPassword(params) {
    assert(params.requestToken, '\'requestToken\' is required');
    assert(params.password, '\'password\' is required');

    let decoded;
    try {
      decoded = await jwt.verify(params.requestToken, this.secretKey, params.subject);
    } catch (err) {
      throw new AuthError(
        'INVALID_TOKEN',
        'Invalid request token',
      );
    }

    const password = await bcrypt.hash(params.password);
    if (isMongooseModel(this.userModel)) {
      await this.userModel
        .findByIdAndUpdate(decoded.sub, { [this.propertyMap.password]: password });
    } else {
      await this.userModel.updatePassword(decoded.sub, password);
    }
  }
}

module.exports = Auth;