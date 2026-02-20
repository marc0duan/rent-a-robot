import Dysmsapi, * as $Dysmsapi from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";

function createClient(): Dysmsapi {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: "dysmsapi.aliyuncs.com",
  });
  return new Dysmsapi(config);
}

export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!signName || !templateCode) {
    throw new Error("Aliyun SMS configuration is incomplete. Set ALIYUN_SMS_SIGN_NAME and ALIYUN_SMS_TEMPLATE_CODE.");
  }

  const client = createClient();

  const request = new $Dysmsapi.SendSmsRequest({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({ code }),
  });

  const runtime = new $Util.RuntimeOptions({});
  const response = await client.sendSmsWithOptions(request, runtime);

  if (response.body?.code !== "OK") {
    throw new Error(
      `SMS send failed: ${response.body?.code} - ${response.body?.message}`
    );
  }
}
