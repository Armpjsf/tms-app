const fs = require('fs');
const path = 'c:/Users/Armdd/TMS_ePOD/src/lib/i18n/dictionaries.ts';

let content = fs.readFileSync(path, 'utf8');

// The TH section replacement block
const thVerification = `      verification: {
        title: 'ยืนยันความถูกต้องของงาน',
        subtitle: 'ตรวจสอบความเรียบร้อยของงานรหัส {{id}}',
        note_label: 'หมายเหตุการตรวจสอบ',
        placeholder_note: 'ระบุรายละเอียดหรือข้อเสนอแนะเพิ่มเติม...',
        reject: 'ปฏิเสธ',
        approve: 'อนุมัติ',
        reject_btn: 'ปฏิเสธ (REJECT)',
        approve_btn: 'อนุมัติ (APPROVE)',
        audit_footer: 'บันทึกประวัติการตรวจสอบในระบบ AUDIT_LOG',
        toast_verified: 'อนุมัติงานเรียบร้อยแล้ว',
        toast_rejected: 'ปฏิเสธงานเรียบร้อยแล้ว'
      },`;

// The EN section replacement block
const enVerification = `    verification: {
      title: 'Operation Verification',
      subtitle: 'Reviewing integrity for Job ID {{id}}',
      note_label: 'Verification Notes',
      placeholder_note: 'Enter additional details or feedback here...',
      reject: 'Reject',
      approve: 'Approve',
      reject_btn: 'REJECT',
      approve_btn: 'APPROVE',
      audit_footer: 'Verification recorded in AUDIT_LOG',
      toast_verified: 'Job verified successfully',
      toast_rejected: 'Job rejected successfully'
    },`;

// 1. Repair TH section (lines around 350-360)
// We look for the messy single-line block from view_file (line 355)
const thMessyPattern = /verification:\s*\{\s*title:\s*'ยืนยันความถูกต้องของงาน'[\s\S]*?\},\s*,/;
content = content.replace(thMessyPattern, thVerification);

// Also remove the extra closing brace I might have left at line 354
content = content.replace(/\s{6}\},\s+\n\s{6}\}\n\s{6}verification:/, '\n      },\n      verification:');
// And ensure jobs ends correctly
content = content.replace(/อัปเดตข้อมูลเรียบร้อย'\n\s{8}\}\n\s{6}\},/, "อัปเดตข้อมูลเรียบร้อย'\n        }\n      },");


// 2. Repair EN section (lines around 1793)
const enMessyPattern = /verification:\s*\{        title:\s*'Operation Verification'[\s\S]*?\},\s+shipment:\s*\{/;
content = content.replace(enMessyPattern, enVerification + '\n    shipment: {');

// 3. Fix the 'shipment' block after relocation in EN (it was also compressed into a single line)
const enShipmentPattern = /shipment:\s*\{\s*title_request:\s*'Request New Shipment \(SHIPMENT_REQUEST\)'[\s\S]*?plan_btn:\s*'Plan Mission'\n\s*\},/;
const enShipmentFixed = `    shipment: {
      title_request: 'Request New Shipment (SHIPMENT_REQUEST)',
      subtitle_request: 'Request New Shipment',
      title_preview: 'Request Details (REQUEST_DETAILS)',
      subtitle_preview: 'Shipment Request Details',
      plan_date: 'Preferred Date',
      origin: 'Pickup Location',
      destination: 'Delivery Location',
      cargo: 'Cargo Type / Weight',
      notes: 'Additional Notes',
      placeholder_origin: 'e.g. Navanakorn',
      placeholder_destination: 'e.g. Samut Prakan',
      placeholder_cargo: 'e.g. Consumer Goods (2 Tons)',
      placeholder_notes: 'Contact info or other details',
      placeholder_no_notes: 'No additional notes provided',
      submit_btn: 'Confirm Request',
      submitting: 'Submitting Data...',
      success_title: 'Request Sent!',
      success_desc: 'We received your request. Admin will process it shortly.',
      toast_success: 'Request sent successfully',
      toast_error: 'An error occurred while sending request',
      back_btn: 'Back',
      plan_btn: 'Plan Mission'
    },`;
content = content.replace(enShipmentPattern, enShipmentFixed);

// 4. Final redundant brace cleanup
content = content.replace(/,\n\s{6}\}\n\s{6}verification:/g, ',\n      },\n      verification:');

fs.writeFileSync(path, content, 'utf8');
console.log('Final emergency repair of dictionaries.ts completed.');
