
const functions = require('firebase-functions');

// firestoreを利用するための設定
const { db } = require('../firestore')

// SendGridの初期設定
const sgMail = require('@sendgrid/mail');

// グローバル定数の呼び出し
const CONSTANTS = require('../lib/constants')



// 0718_練習用のapi呼び出しファンクション。 STR 以下消す予定
// onCallの１引数dataが、呼び出し元から投げるpayload
exports.testFunction = functions
  .https.onCall(async (data, context) => {
    console.log('■■■■■■　　0721_ver2_testFunctionを実行したぞ！！getAuth()！★★★★★★★')
    
    // console.log('■■■　tokenの中身★')
    // console.log(context.auth.token.company_key)
    // console.log(context.auth.token.facility_key)
    // console.log('■■■■■■■■■■■■■　おわり')

    const accountsRef = db.collection('accounts').where("company_key", "==" , "MEDICALLIFECARE");
    const snapshot = await accountsRef.get();
    snapshot.forEach(doc => {
      console.log('◆◆◆◆◆　0721_newnew_field_company_keyでrefしたwhere した。ここのループ処理！！！')
      console.log(doc.id, '=>', doc.data());
    });


    return context.auth.token
  })
// 0718_練習用のapi呼び出しファンクション。 STR 以上消す予定



// ■■■■■■■ 0506_LINE WORKS用のモジュール読み込み Str
// エンコード時、JWT取得時に必要
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
// API用
var request = require('request');

// 1. JWTを生成
// function getJwt_(privateKeyPath, client_id, service_account){
function getJwt_(company_key){

  // privateKey.keyのファイル格納ディレクトリとkeyファイル名をセット（ファイル名は会社コードの小文字
  const keyPath = `./key/${company_key}.key`
  const CLIENT_ID = functions.config()[company_key]['line_works']['client_id']
  const SERVICE_ACCOUNT = functions.config()[company_key]['line_works']['service_account']

  // base64エンコード
  const base64 = json => {
      const jsonStr = JSON.stringify(json)
      const jsonB64 = Buffer.from(jsonStr).toString('base64').replace(/={1,2}$/,"")
      return jsonB64
  }

  // 電子署名
  const createSignature = data => {
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(data)
      // const privateKey = fs.readFileSync(path.resolve(privateKeyPath), "utf8");
      const privateKey = fs.readFileSync(keyPath, "utf8");
      const signedData = sign.sign(privateKey, 'base64').replace(/={1,2}$/,"")
      return signedData
  }

  // jwt生成の初期設定
  const header = { alg: 'RS256', typ: 'JWT' }
  const startTime = new Date()
  const endTime = new Date(startTime.getTime() + 1000 * 60 * 30)
  // 引数のセット
  const payload = {
      iss: CLIENT_ID,
      sub: SERVICE_ACCOUNT,
      iat: Math.floor(startTime.getTime() / 1000),
      exp: Math.floor(endTime.getTime() / 1000)
  }

  const unsignedToken = `${base64(header)}.${base64(payload)}`
  const signature = createSignature(unsignedToken)
  const jwt = `${unsignedToken}.${signature}`

  console.log(`jwt: ${jwt}`)
  // JWTを結果として返す
  return jwt
}


// 2.JWTを使ってAccess Tokenを取得
// function getAccessToken_(client_id, client_secret, scopes) {
function getAccessToken_(company_key) {
  // 初期設定
  // GrantTypeセット
  const bodyGrantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
  const scopes = "bot"
  const CLIENT_ID = functions.config()[company_key]['line_works']['client_id']
  const CLIENT_SECRET = functions.config()[company_key]['line_works']['client_secret']

  // JWTを生成
  // const jwt = getJwt_(CONSTANTS.ENV.PRIVATE_KEY_PATH, CONSTANTS.ENV.CLIENT_ID, CONSTANTS.ENV.SERVICE_ACCOUNT)
  const jwt = getJwt_(company_key)

  // トークン取得のAPI設定
  var options = {
      method: "POST",
      uri: "https://auth.worksmobile.com/oauth2/v2.0/token",
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      form: {
          'grant_type': bodyGrantType,
          'assertion': jwt,
          "client_id": CLIENT_ID,
          "client_secret": CLIENT_SECRET,
          "scope": scopes,
      }
  }

  // 同期処理となるようにpromise形式に修正
  return new Promise((resolve, reject) => {
    request(options, ((error, res, body) => {
      if (!error && res.statusCode == 200) {
        console.log(`token: ${JSON.parse(body).access_token}`)
        resolve(JSON.parse(body).access_token);
      } else {
        reject(error);
      }
    }));
  });

}


// 3. LINE WORKS BOTでメッセージ送信
async function sendMessage(company_key, botId, channelId, message) {
  // アクセストークンを取得
  // const token = await getAccessToken_(CONSTANTS.ENV.CLIENT_ID, CONSTANTS.ENV.CLIENT_SECRET, scopes)
  const token = await getAccessToken_(company_key)

  // LINE WORKS API送信用のオプションセット
  const options = {
      url: `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`,
      headers : {
        'Content-Type' : 'application/json;charset=UTF-8',
        'Authorization' : "Bearer " + token,
      },
      json: {
        "content" : {
          "type" : "text",
          "text" : message,
        }
      }
  };

  // LINE WORKS BOTのメッセージ送信API実行
  request.post(options, (error, response, body) => {
      if (error) {
        console.log('LINEWORKS BOTでエラーが発生しました。')
          console.log(error);
      } else {
        console.log('LINE WORKS Botメッセージ送信に成功しました。')        
      }
  });
}
// ■■■■■■■ 0506_LINE WORKS用のモジュール読み込み End


// ■■■　事故データ新規登録時のメール送信トリガーファンクション
// firestoreのドキュメントの新規追加をトリガーとしている
exports.newAccidentAlertMail = functions.firestore.document('company/{company_key}/facility/{facility_key}/accidents/{docID}').onCreate(async (snap, context) => {

  console.log('【20220720★修正】newAccidentAlertMail実行★★★★★★★')

  // 新規登録の事故データ
  const newAccidentData = snap.data()

  // console.log(`タイトル：${snap.data().title}`)
  // console.log('■■■■■■　新規作成時のカスタムクレームからのキーを取得')
  // console.log('■■■　contextの中身★')
  // console.log(context)
  // console.log('■■■　paramsの中身★')
  // console.log(context.params)
  // console.log(context.params.company_key)
  // console.log('■■■■■■■■■■■■■　おわり')  

  // ■　company_keyとfacility_keyをパラメータから取得＿セット
  const company_key = context.params.company_key
  const facility_key = context.params.facility_key

  // ■　SendGrid設定
  // 送信元メールアドレス
  const sender_mail = functions.config()[company_key.toLowerCase()]['sendgrid']['sender_mail']
  // firebaseの環境変数に設定したSendGridのAPIキーを設定
  sgMail.setApiKey(functions.config()[company_key.toLowerCase()]['sendgrid']['apikey']);


  // 施設アカウント情報より対象の施設名を取得
  // 施設アカウント情報格納変数
  let facility = ''
  // firestoreより施設アカウント情報の取得
  await db.doc(`company/${company_key}/facility/${facility_key}`)
    .get()
    .then((docSnapshot) => {
      // 施設アカウント情報
      facility = docSnapshot.data()
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });
  

  // ■　送信先メール一覧をMANAGERアカウントの[receiving_mail_target]から取得
  // 送信先メール一覧格納変数
  let sendMailTo = []
  // ※　【0720_仕様変更】accountsアカウントコレクションには、MANAGERのみになったので、このwhere分は不要になった。
  // 管理者アカウントのcollection
  // const accountsRef = db.collection("accounts").where("type", "==", CONSTANTS.ACCOUNT_TYPE.MANAGER)
  const accountsRef = db.collection('accounts').where("company_key", "==", company_key);
  const snapshot = await accountsRef.get();
  // 取得したManagerアカウントデータをループ処理
  snapshot.forEach(doc => {
    // console.log(doc.id, '=>', doc.data());
    // 管理者アカウント情報
    const managerAccount = doc.data()
    // receiving_mail_targetに, loginIDが含まれる場合は、管理者の通知メールを追加
    if( managerAccount.receiving_mail_target.includes(facility_key) ) {
      // ここで送信先メール一覧を作成
      sendMailTo.push(managerAccount.mail_address)
    }    
  });

  // 重複するメールアドレスの削除
  sendMailTo = [...new Set(sendMailTo)]
  // 送信先メール一覧
  console.log(`sendMailTo: ${sendMailTo}`)
  

  // 【0725_仕様変更】SendGridのメール通知先が0の場合もLINEWORKSが動くように削除
  // // sendMailToが無し(空)の場合、処理終了
  // if(!sendMailTo.length) return
  

  // ■　表示項目の設定開始
  // 発生場所  
  let place_name = []
  // 発生場所が入力されているとき
  if(newAccidentData.place.selected) {
    newAccidentData.place.selected.forEach(val => {
      let temp = CONSTANTS.ACCIDENT_PLACE.find(place_list => place_list.id === val )
      place_name.push(temp.p_name)
    })
    // 発生場所が入力されていないとき
  } else {
    place_name = '未設定'
  }

  // 事故種別
  let type_name = []
  // 発生場所が入力されているとき
  if(newAccidentData.type.selected) {
    newAccidentData.type.selected.forEach(val => {
      let temp = CONSTANTS.ACCIDENT_TYPE.find(type_list => type_list.id === val )
      type_name.push(temp.t_name)
    })
    // 発生場所が入力されていないとき
  } else {
    type_name = '未設定'
  }

  // 管理者連絡
  const manager_contact = newAccidentData.manager_contact_status ? `連絡済み（${newAccidentData.manager_name}）` : '未連絡'

  // 介護度の表示形式を変換
  const care_level = CONSTANTS.CARE_LEVEL.find(val => val.id === newAccidentData.care_level)  
  const care_level_name = care_level ? care_level.c_name : '未登録'

  // 認知症高齢者の生活自立度
  const dementia = CONSTANTS.DEMENTIA.find(val => val.id === newAccidentData.dementia)
  const dementia_name = dementia ? dementia.d_name : '未登録'

  // 0216_未連絡ステータスのときは、連絡者・家族氏名等の情報は非表示
  // ご家族連絡ステータス
  // const family_contact_status_text = newAccidentData.family_contact_status ? '連絡済み' : '未連絡'

  let family_contact_txt = ''
  // 家族連絡ステータス：false(未連絡)の場合：
  if(!newAccidentData.family_contact_status) {
    family_contact_txt = 'ステータス：未連絡<br>'
  } else {
    // 家族連絡ステータス：false(未連絡)の場合：
    family_contact_txt = `
      ステータス：連絡済み<br>
      連絡日時：${newAccidentData.family_contact_date}　${newAccidentData.family_contact_time}頃<br>
      連絡者：${newAccidentData.family_contact_staff_name}<br>
      家族氏名：${newAccidentData.family_contact_family_name}<br>   
      続柄：${newAccidentData.family_contact_family_relationship}<br>   
    `
  }

  // ■　表示項目の設定終了

  // ■　SendGrid送信内容の設定
  const msg = {
    to: sendMailTo,
    from: sender_mail,
    subject: `【事故報告 第一報】${facility.name}`,
    html: `新しい事故報告が届きました。<br><br><br>
          ====================<br>
          ■　ご利用者様情報<br>
          ====================<br>
          所属施設：${facility.name}<br>
          対象者：${newAccidentData.user_name}様<br>
          年齢：${newAccidentData.user_age}<br>
          介護度：${care_level_name}<br><br>
          ====================<br>
          ■　事故内容<br>
          ====================<br>
          事故タイトル：${newAccidentData.title}<br>
          発生日時：${newAccidentData.date} ${newAccidentData.time}頃<br>
          発生場所：${place_name}<br>
          事故種別：${type_name}<br>
          担当者：${newAccidentData.staff_name}<br><br>
          管理者連絡：${manager_contact}<br><br>
          ====================<br>
          ■　ご家族連絡<br>
          ====================<br>
          ${family_contact_txt}<br><br>
          `
          // 0408_削除
          // 認知症高齢者の生活自立度：${dementia_name}<br><br>          
  }

  // ■　SendGridでメール送信
  try {
    // SendGridでメール送信実行
    await sgMail.send(msg)

  } catch (error) {
    // エラーメッセージ送信先メールアドレス
    // configの会社名.admin_mail
    const admin_mail = functions.config()[company.toLowerCase()]['admin_mail']
    // エラーメッセージ内容設定
    const err_msg = {
      to: admin_mail,
      from: sender_mail,
      subject: `【SendGridメール送信エラー】`,
      html: `SnedGrid送信時にエラーが発生しました。<br>
            エラーコード：${error.code}<br><br><br>
            送信予定だったメールリスト：${sendMailTo}<br><br>             
            ====================<br>
            ■　事故情報<br>
            ====================<br>
            施設名：${facility.name}<br>
            事故タイトル：${newAccidentData.title}<br>
            発生日時：${newAccidentData.date} ${newAccidentData.time}頃<br>
            発生場所：${place_name}<br>
            事故種別：${type_name}<br>
            担当者：${newAccidentData.staff_name}<br>
            管理者連絡：${manager_contact}<br><br><br> 
            `
    }
    // SendGridでメール送信
    await sgMail.send(err_msg)
  }
  

  // ■■■　LINE WORKS通知機能実装
  // 0510_機能追加実装
  console.log('LINEWORKS API開始！！')

  // 家族連絡状況_lineWorksメッセージ用
  let hospital_contact_line = ''
  // 家族連絡ステータス：false(未連絡)の場合：
  if(!newAccidentData.family_contact_status) {
    hospital_contact_line = '未連絡'
  } else {
    // 家族連絡ステータス：false(未連絡)の場合：
    hospital_contact_line = `連絡済み
医療機関名：${(newAccidentData.hospital_contact_name ? newAccidentData.hospital_contact_name : '')}`
  }

  // 家族連絡状況_lineWorksメッセージ用
  let family_contact_line = ''
  // 家族連絡ステータス：false(未連絡)の場合：
  if(!newAccidentData.family_contact_status) {
    family_contact_line = '未連絡'
  } else {
    // 家族連絡ステータス：false(未連絡)の場合：
    family_contact_line = `連絡済み
連絡日：${newAccidentData.family_contact_date}
連絡時刻：${(newAccidentData.family_contact_time ? newAccidentData.family_contact_time + ' 頃' : '')}
連絡者：${(newAccidentData.family_contact_staff_name ? newAccidentData.family_contact_staff_name : '')}
家族氏名：${(newAccidentData.family_contact_family_name ? newAccidentData.family_contact_family_name : '')}
続柄：${(newAccidentData.family_contact_family_relationship ? newAccidentData.family_contact_family_relationship : '')}`
  }


  // ■ LINE WORKS APIの送信メッセージ内容のセット
  const line_msg = `【ご利用者様情報】
所属施設：${facility.name}
対象者：${newAccidentData.user_name} 様
年齢：${newAccidentData.user_age}
介護度：${care_level_name}

【事故情報】
発生日：${newAccidentData.date}
発生時刻：${newAccidentData.time}頃
場所：${place_name}
種別：${type_name}
担当者：${newAccidentData.staff_name}
事故タイトル：${newAccidentData.title}

管理者連絡：${manager_contact}

医療機関連絡：${hospital_contact_line}

ご家族連絡：${family_contact_line}`



  // 事故が新規登録された施設のエリアコードをセット
  const area_code = facility.area

  // company のdoc情報から、エリア別のAPI送信先botID, channelIDを取得
  // await db.doc(`company/${company}`)
  await db.doc(`company/${company_key}`)
    .get()
    .then((docSnapshot) => {
      // 施設アカウント情報
      const area_array = docSnapshot.data()['AREA']
      // 施設のエリアコードと一致するエリア情報をfindで検索取得
      const target_area_obj = area_array.find(element => element.id == area_code)

      console.log('★　ターゲットエリア！！★★★★★★')
      console.log(target_area_obj)

      // companyコレクションのエリアデータ内のlineworks arrayをループ処理
      // lineworks array: botId, channelIdのデータが入ったオブジェクト
      target_area_obj['lineworks'].forEach(e => {
        // ■ line works apiによるメッセージ送信実行 ★ここはtrycatch？？
        sendMessage(company_key.toLowerCase(), e.botId, e.channelId, line_msg)
      })
    })
    .catch((error) => {
      console.log("Error getting documents: ", error);
    });

})
