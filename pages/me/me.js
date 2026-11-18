const store = require('../../utils/store');
const D = require('../../utils/date');

const AGREEMENT = '1. 本程序用于个人时间计划与计时记录。\n2. 所有数据仅保存在你的微信本地缓存中，卸载或清理缓存会导致数据丢失，请定期导出备份。\n3. 本程序不承诺数据永久保存，因清理缓存造成的数据丢失需自行承担。\n4. 禁止利用本程序从事任何违法违规用途。';
const PRIVACY = '1. 你的计划、计时记录、昵称与头像均保存在本机微信缓存，不会上传到任何服务器。\n2. 昵称与头像仅用于本机界面展示，你可以随时修改或清空。\n3. 导出功能生成的文件由你自行分享与保管，请注意其中包含你的全部记录。\n4. 如需删除全部数据，可在微信中清除本小程序缓存。';

Page({
  data: { nick: '', avatar: '', initial: '我', legal: null },

  onShow() {
    const pr = store.load().profile;
    this.setData({
      nick: pr.nick, avatar: pr.avatar,
      initial: pr.nick ? pr.nick[0] : '我'
    });
  },

  chooseAvatar(e) {
    const path = e.detail.avatarUrl;
    const fs = wx.getFileSystemManager();
    fs.saveFile({
      tempFilePath: path,
      success: (r) => store.setProfile({ avatar: r.savedFilePath }),
      fail: () => store.setProfile({ avatar: path })
    });
    this.setData({ avatar: path });
  },

  onNick(e) {
    const nick = e.detail.value.trim();
    store.setProfile({ nick });
    this.setData({ nick, initial: nick ? nick[0] : '我' });
  },

  exportData() {
    const path = `${wx.env.USER_DATA_PATH}/plan-timer-${D.today()}.json`;
    const fs = wx.getFileSystemManager();
    fs.writeFile({
      filePath: path,
      data: store.exportJSON(),
      encoding: 'utf8',
      success: () => {
        wx.shareFileMessage({
          filePath: path,
          fileName: `plan-timer-${D.today()}.json`,
          fail: () => wx.showToast({ title: '已导出，可在聊天中发送文件备份', icon: 'none' })
        });
      },
      fail: () => wx.showToast({ title: '导出失败，请重试', icon: 'none' })
    });
  },

  importData() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['json'],
      success: (r) => {
        const path = r.tempFiles[0].path;
        wx.getFileSystemManager().readFile({
          filePath: path, encoding: 'utf8',
          success: (d) => {
            let obj = null;
            try { obj = JSON.parse(d.data); } catch (e) { obj = null; }
            if (!obj || !Array.isArray(obj.plans) || !Array.isArray(obj.segs)) {
              wx.showToast({ title: '文件格式不正确', icon: 'none' });
              return;
            }
            wx.showModal({
              title: '导入并覆盖当前数据？',
              content: `文件中包含 ${obj.plans.length} 个计划、${obj.segs.length} 条记录。当前数据将被替换，建议先导出备份。`,
              confirmText: '导入',
              success: (m) => {
                if (m.confirm) {
                  store.replace(obj);
                  this.onShow();
                  wx.showToast({ title: '已导入', icon: 'success' });
                }
              }
            });
          },
          fail: () => wx.showToast({ title: '读取文件失败', icon: 'none' })
        });
      }
    });
  },

  openLegal(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      legal: {
        title: type === 'agreement' ? '用户协议' : '隐私政策',
        body: type === 'agreement' ? AGREEMENT : PRIVACY
      }
    });
  },
  closeLegal() { this.setData({ legal: null }); },

  about() {
    wx.showModal({
      title: '计划计时器',
      content: '版本 1.0.0\n数据保存在本机，按微信账号隔离，互不影响。',
      showCancel: false
    });
  }
});
