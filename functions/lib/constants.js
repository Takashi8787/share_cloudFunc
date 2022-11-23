// import { XX } from "pdfmake/build/pdfmake"

// 1227追記、全体で使えるようにする設定変更点
// export default class Constants {
class Constants {



  // ■■■　システム定数　■■■
  // バックアップ用のバケット指定定数
  // static BUCKET = 'gs://accidentsapp-2bd0f-backup-firestore'
  static BUCKET = '0704_test'

  // 日付検索のデフォルト日
  static DEFAULT_STR_DATE = '2022-01-01'
  // 検索期間(月単位)
  static MONTHLY_SPAN = 12
  // 利用者docIDの桁数（CSVインポートに使う）
  static USER_ID_DIGITS = 10
  // CSVインポートフラグ
  static IMPORT_TYPE = {
    MANUAL: 'MANUAL',
    WISEMAN: 'WISEMAN',
    KAISYU: 'KAISYU'
  }
  // アカウント種別の定数
  static ACCOUNT_TYPE = {
    MANAGER: 'MANAGER',  // 管理者アカウント
    FACILITY: 'FACILITY',  // 施設長アカウント
    STAFF: 'STAFF'  // 現場アカウント
  }


  // ■■■ 事故情報定数　■■■
  // 事故データステータス
  static ACCIDENT_STATUS = {
    // 事故データ入力ステータス(accident)
    // accident_manager_apply: 11, // manager提出(承認待ち、施設管理者承認)
    a_facility_apply: 12, // 施設管理者提出(承認待ち)
    a_input: 13, // 作成中
    a_facility_accept: 15, // 施設管理者承認
    // a_m_approval: 16, // manager承認
    a_facility_remand: 17, // 施設管理者差し戻し
    // accident_manager_remand: 18, // manager差し戻し

    // 再発予防策スタータス(prevention)
    p_manager_apply: 41, // manager提出(承認待ち、施設管理者承認)(41)
    p_facility_apply: 42, // 施設管理者提出(承認待ち)(42)
    p_input: 43, // 再発予防策の作成中(43)
    p_manager_accept: 46, // managerの承認(46)
    p_facility_remand: 47, // 施設管理者の差し戻し(47)
    p_manager_remand: 48, // managerの差し戻し(48)

    // 効果確認(effect)
    e_manager_apply: 71, // manager提出(承認待ち、施設管理者承認)(71)
    e_facility_apply: 72, // 施設管理者提出(承認待ち)(72)
    e_input: 73, // 再発予防策の作成中(73)
    e_manager_accept: 76, // managerの承認(76)
    e_facility_remand: 77, // 施設管理者の差し戻し(77)
    e_manager_remand: 78, // managerの差し戻し(78)

    // 完了済みステータス
    complete: 100, //完了
  }


  static HIYARI_STATUS = {
    // ヒヤリハット作成ステータス(Hiyari)
    h_facility_apply: 12, // 施設管理者提出(承認待ち)(12)
    h_input: 13, // ヒヤリ・ハット作成中(13)
    h_facility_remand: 17, // 施設管理者差し戻し(17)
    
    // 完了済みステータス
    complete: 100, //完了(100)
  }


  // 事故発生場所の値、ラベルリスト
  static ACCIDENT_PLACE = [ 
    { id: '01', p_name: '居室（個室）'},
    { id: '02', p_name: '居室（多床室）'},
    { id: '03', p_name: 'トイレ'},
    { id: '04', p_name: '廊下'}, 
    { id: '05', p_name: '食堂等共用部'}, 
    { id: '06', p_name: '浴室・脱衣室'}, 
    { id: '07', p_name: '機能訓練室'}, 
    { id: '08', p_name: '施設敷地内の建物外'}, 
    { id: '09', p_name: '敷地外'},
    { id: '99', p_name: 'その他'},
  ]

  // 事故種別の値、ラベルリスト
  static ACCIDENT_TYPE = [ 
    { id: '01', t_name: '転倒'},
    { id: '02', t_name: '転落'},
    { id: '03', t_name: '誤嚥・窒息'},
    { id: '04', t_name: '異食'}, 
    { id: '05', t_name: '薬関係(落薬、誤薬等)'}, 
    { id: '06', t_name: '医療処置関連(チューブ抜去等)'}, 
    { id: '07', t_name: '不明'}, 
    { id: '99', t_name: 'その他'},
  ]

  // ヒヤリ種別の値、ラベルリスト
  static HIYARIHAT_TYPE = [ 
    { id: '01', t_name: '転倒'},
    { id: '02', t_name: '転落'},
    { id: '03', t_name: '誤嚥・窒息'},
    { id: '04', t_name: '異食'}, 
    { id: '05', t_name: '薬関係(落薬、誤薬等)'}, 
    { id: '06', t_name: '医療処置関連(チューブ抜去等)'}, 
    { id: '07', t_name: '不明'}, 
    { id: '99', t_name: 'その他'}, 
  ]

  // 事故原因リスト
  static ACCIDENT_CAUSE_FACTOR = [
    // 本人要因
    { id: '01', t_name: '生活活動'},
    { id: '02', t_name: '低血圧・低血糖・脱水'},
    { id: '03', t_name: '薬物処方状況'},
    { id: '04', t_name: '機能低下'},
    { id: '09', t_name: 'その他'},
    // 介護者要因
    { id: '21', t_name: '介助動作'}, 
    { id: '22', t_name: '介助手順'}, 
    { id: '23', t_name: '意思確認'}, 
    { id: '24', t_name: 'アセスメント不足'},
    { id: '29', t_name: 'その他'},
    // 環境要因
    { id: '51', t_name: '動作環境'}, 
    { id: '52', t_name: '設備・用具の不備'}, 
    { id: '59', t_name: 'その他'}, 
  ]


  // ヒヤリ・ハット原因リスト
  static HIYARI_CAUSE_FACTOR = [ 
    { id: '01', ctype_name: '自分自身'},
    { id: '02', ctype_name: '利用者自身'},
    { id: '03', ctype_name: '業務内容'},
    { id: '04', ctype_name: '設備・機械等'}, 
    { id: '99', ctype_name: 'その他'},
  ]



  // ■■■ 利用者情報管理定数　■■■
  // 要介護度
  static CARE_LEVEL = [
    {id: 1, c_name: '自立'},
    {id: 12, c_name: '要支援1'},
    {id: 13, c_name: '要支援2'},
    {id: 21, c_name: '要介護1'},
    {id: 22, c_name: '要介護2'},
    {id: 23, c_name: '要介護3'},
    {id: 24, c_name: '要介護4'},
    {id: 25, c_name: '要介護5'},
  ]

  // 認知症高齢者 日常生活自立度
  // {id: 0, d_name: '未登録'},
  static DEMENTIA = [
    {id: '00', d_name: '無し'},
    {id: '11', d_name: 'Ⅰ'},
    {id: '21', d_name: 'Ⅱa'},
    {id: '22', d_name: 'Ⅱb'},
    {id: '31', d_name: 'Ⅲa'},
    {id: '32', d_name: 'Ⅲb'},
    {id: '41', d_name: 'Ⅳ'},
    {id: '51', d_name: 'M'},
  ]

  // // 既往歴および身体機能状況
  // // { id: '00', m_name: '未登録'},
  // static MEDICAL_HISTORY = [
  //   { id: '00', m_name: '無し'},
  //   { id: '01', m_name: '高血圧'},
  //   { id: '02', m_name: '高脂血症'},
  //   { id: '03', m_name: '糖尿病'},
  //   { id: '04', m_name: '肝疾患'},
  //   { id: '05', m_name: '脳梗塞'},
  //   { id: '06', m_name: '脳内出血'}, 
  //   { id: '07', m_name: '心疾患'}, 
  //   { id: '08', m_name: '膵臓疾患'}, 
  //   { id: '09', m_name: '腰痛'},
  //   { id: '10', m_name: '膝関節症'},
  //   { id: '11', m_name: '頚椎症'},
  //   { id: '20', m_name: '骨折'},
  //   { id: '99', m_name: 'その他'},
  // ]

  // ■■■ 職員情報管理定数　■■■
  // 職種
  // {id: 0, o_name: '未登録'},
  static OCCUPATION = [
    // {id: '00', d_name: '無し'},
    {id: '11', o_name: '介護'},
    {id: '12', o_name: '看護'},
    {id: '13', o_name: '入浴'},
    {id: '14', o_name: '相談員'},
    {id: '15', o_name: '計画作成'},
    {id: '16', o_name: '事務'},
    {id: '17', o_name: '施設長'},
    {id: '99', o_name: 'その他'},
  ]  

}

// 1227追記、全体で使えるようにする設定変更点
module.exports = Constants
