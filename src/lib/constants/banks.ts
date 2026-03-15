export const BANKS = [
  { label: "ไทยพาณิชย์ (SCB)", value: "SCB", code: "014" },
  { label: "กสิกรไทย (KBANK)", value: "KBANK", code: "002" },
  { label: "กรุงเทพ (BBL)", value: "BBL", code: "004" },
  { label: "กรุงไทย (KTB)", value: "KTB", code: "006" },
  { label: "กรุงศรีอยุธยา (BAY)", value: "BAY", code: "025" },
  { label: "ทหารไทยธนชาต (ttb)", value: "TTB", code: "011" },
  { label: "ออมสิน (GSB)", value: "GSB", code: "030" },
  { label: "เพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)", value: "BAAC", code: "034" },
  { label: "อาคารสงเคราะห์ (GHB)", value: "GHB", code: "033" },
  { label: "ยูโอบี (UOB)", value: "UOB", code: "024" },
  { label: "ซีไอเอ็มบี ไทย (CIMBT)", value: "CIMBT", code: "022" },
  { label: "เกียรตินาคินภัทร (KKP)", value: "KKP", code: "069" },
  { label: "ทิสโก้ (TISCO)", value: "TISCO", code: "067" },
  { label: "ไอซีบีซี (ไทย) (ICBCT)", value: "ICBCT", code: "070" },
  { label: "ไทยเครดิต (TCRB)", value: "TCRB", code: "071" },
  { label: "แลนด์ แอนด์ เฮ้าส์ (LH Bank)", value: "LHBANK", code: "073" },
];

export const getBankCode = (bankValue: string | null | undefined) => {
  if (!bankValue) return "014"; // Default to SCB if not specified
  const bank = BANKS.find(b => b.value === bankValue || b.label.includes(bankValue));
  return bank ? bank.code : "014";
};
