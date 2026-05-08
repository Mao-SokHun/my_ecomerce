import type { AppLang } from './requestLang';

export type AddressMsgKey =
  | 'requireNamePhone'
  | 'requireHierarchyIds'
  | 'provinceNotFound'
  | 'districtNotFound'
  | 'communeNotFound'
  | 'villageNotFound'
  | 'communeMismatch'
  | 'districtMismatch'
  | 'provinceMismatch'
  | 'addressNotFound'
  | 'addressAdded'
  | 'addressUpdated'
  | 'addressDeleted';

const MESSAGES: Record<AddressMsgKey, Record<AppLang, string>> = {
  requireNamePhone: {
    km: 'សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទ។',
    en: 'Please provide name and phone.',
    zh: '请填写姓名和电话号码。',
  },
  requireHierarchyIds: {
    km: 'សូមជ្រើសរើសខេត្ត/រាជធានី ស្រុក/ខណ្ឌ ឃុំ/សង្កាត់ និងភូមិពីបញ្ជីផ្លូវការ។',
    en: 'Please select province, district, commune and village from the official lists.',
    zh: '请从官方列表中选择省/直辖市、区县、乡/分区与村。',
  },
  provinceNotFound: {
    km: 'រកមិនឃើញខេត្ត/រាជធានីក្នុងប្រព័ន្ធ។',
    en: 'Province not found in official data.',
    zh: '官方数据中找不到该省/直辖市。',
  },
  districtNotFound: {
    km: 'រកមិនឃើញស្រុក/ខណ្ឌក្នុងប្រព័ន្ធ។',
    en: 'District not found in official data.',
    zh: '官方数据中找不到该区县。',
  },
  communeNotFound: {
    km: 'រកមិនឃើញឃុំ/សង្កាត់ក្នុងប្រព័ន្ធ។',
    en: 'Commune not found in official data.',
    zh: '官方数据中找不到该乡/分区。',
  },
  villageNotFound: {
    km: 'ភូមិមិនមានក្នុងប្រព័ន្ធ។',
    en: 'Village not found in official data.',
    zh: '官方数据中找不到该村。',
  },
  communeMismatch: {
    km: 'ឃុំ/សង្កាត់មិនត្រូវនឹងភូមិដែលបានជ្រើស។',
    en: 'Selected commune does not match the village.',
    zh: '所选乡/分区与该村不一致。',
  },
  districtMismatch: {
    km: 'ស្រុក/ខណ្ឌមិនត្រូវនឹងឃុំដែលបានជ្រើស។',
    en: 'Selected district does not match the commune.',
    zh: '所选区县与乡/分区不一致。',
  },
  provinceMismatch: {
    km: 'ខេត្ត/រាជធានីមិនត្រូវនឹងស្រុកដែលបានជ្រើស។',
    en: 'Selected province does not match the district.',
    zh: '所选省/直辖市与区县不一致。',
  },
  addressNotFound: {
    km: 'រកមិនឃើញអាសយដ្ឋាន។',
    en: 'Address not found.',
    zh: '找不到该地址。',
  },
  addressAdded: {
    km: 'បានបន្ថែមអាសយដ្ឋាន។',
    en: 'Address added.',
    zh: '地址已添加。',
  },
  addressUpdated: {
    km: 'បានធ្វើបច្ចុប្បន្នភាពអាសយដ្ឋាន។',
    en: 'Address updated.',
    zh: '地址已更新。',
  },
  addressDeleted: {
    km: 'បានលុបអាសយដ្ឋាន។',
    en: 'Address deleted.',
    zh: '地址已删除。',
  },
};

export function addressMsg(key: AddressMsgKey, lang: AppLang): string {
  const row = MESSAGES[key];
  return row[lang] ?? row.en;
}
