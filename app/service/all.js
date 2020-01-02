/**
 * @file
 * @author huangzongzhe
 * 2018.08
 */
const BaseService = require('../core/baseService');
const utils = require('../utils/utils');

class AllService extends BaseService {

  async getAllBlocks(options) {
    const { redisKeys } = this.app.config;
    let blocksCount = await this.redisCommand('get', redisKeys.blocksCount) || 0;
    blocksCount = parseInt(blocksCount, 10);
    const aelf0 = this.ctx.app.mysql.get('aelf0');
    const { limit, page, order } = utils.parseOrder(options);
    const offset = limit * page;
    const getBlocksSql = `select id from blocks_0 ORDER BY block_height ${order} limit ? offset ?`;
    const blocksIds = await this.selectQuery(aelf0, getBlocksSql, [ limit, offset ]);
    let blocks = [];
    if (blocksIds.length > 0) {
      blocks = await this.selectQuery(
        aelf0,
        `select * from blocks_0 where id in (${new Array(blocksIds.length).fill('?').join(',')}) ORDER BY id ${order}`,
        blocksIds.map(v => v.id)
      );
    }
    return {
      total: blocksCount,
      blocks
    };
  }

  async getAllTransactions(options) {
    const { redisKeys } = this.app.config;
    let txsCount = await this.redisCommand('get', redisKeys.txsCount) || 0;
    txsCount = parseInt(txsCount, 10);
    const aelf0 = this.ctx.app.mysql.get('aelf0');
    const { limit, page, order } = utils.parseOrder(options);
    const offset = limit * page;
    const buffer = 10000;
    let whereCondition = `WHERE id BETWEEN ${offset + 1} AND ${(page + 1) * limit + buffer}`;
    if (order.toUpperCase() === 'DESC') {
      const maxIdSql = 'select id from transactions_0 ORDER BY id DESC LIMIT 1';
      let maxId = await this.selectQuery(aelf0, maxIdSql, []);
      maxId = maxId[0].id;
      let floor = maxId - (page + 1) * limit - 1 - buffer;
      floor = floor <= 0 ? 1 : floor;
      whereCondition = `WHERE id BETWEEN ${floor} AND ${maxId - offset}`;
    }
    const getTxsSql = `select id from transactions_0 ${whereCondition} ORDER BY id ${order} limit ?`;
    const txsIds = await this.selectQuery(aelf0, getTxsSql, [ limit, offset ]);
    let txs = [];
    if (txsIds.length > 0) {
      txs = await this.selectQuery(
        aelf0,
        `select * from transactions_0 where id in (${new Array(txsIds.length).fill('?').join(',')}) ORDER BY id ${order}`,
        txsIds.map(v => v.id)
      );
    }
    return {
      total: txsCount,
      transactions: this.service.getTransferAmount.filter(txs)
    };
  }
}

module.exports = AllService;
