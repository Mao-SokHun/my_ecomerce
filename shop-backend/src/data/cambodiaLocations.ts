export interface LocationSeed {
  province: string;
  districts: {
    district: string;
    communes: {
      commune: string;
      villages: string[];
    }[];
  }[];
}

// Source baseline: Cambodia commune/sangkat structure from Khmer Wikipedia.
export const CAMBODIA_LOCATIONS: LocationSeed[] = [
  {
    province: 'រាជធានីភ្នំពេញ',
    districts: [
      {
        district: 'ខណ្ឌសែនសុខ',
        communes: [
          { commune: 'សង្កាត់ទឹកថ្លា', villages: ['ភូមិទឹកថ្លា'] },
          { commune: 'សង្កាត់ភ្នំពេញថ្មី', villages: ['ភូមិភ្នំពេញថ្មី'] },
        ],
      },
      {
        district: 'ខណ្ឌដូនពេញ',
        communes: [
          { commune: 'សង្កាត់ផ្សារថ្មីទី១', villages: ['ភូមិផ្សារថ្មី'] },
        ],
      },
    ],
  },
  {
    province: 'ខេត្តកណ្តាល',
    districts: [
      {
        district: 'ស្រុកកៀនស្វាយ',
        communes: [
          { commune: 'ឃុំដីឥដ្ឋ', villages: ['ភូមិដីឥដ្ឋ'] },
        ],
      },
    ],
  },
  {
    province: 'ខេត្តសៀមរាប',
    districts: [
      {
        district: 'ក្រុងសៀមរាប',
        communes: [
          { commune: 'សង្កាត់ស្វាយដង្គំ', villages: ['ភូមិស្វាយដង្គំ'] },
        ],
      },
    ],
  },
  { province: 'ខេត្តបន្ទាយមានជ័យ', districts: [] },
  { province: 'ខេត្តបាត់ដំបង', districts: [] },
  { province: 'ខេត្តកំពង់ចាម', districts: [] },
  { province: 'ខេត្តកំពង់ឆ្នាំង', districts: [] },
  { province: 'ខេត្តកំពង់ស្ពឺ', districts: [] },
  { province: 'ខេត្តកំពង់ធំ', districts: [] },
  { province: 'ខេត្តកំពត', districts: [] },
  { province: 'ខេត្តកោះកុង', districts: [] },
  { province: 'ខេត្តក្រចេះ', districts: [] },
  { province: 'ខេត្តមណ្ឌលគិរី', districts: [] },
  { province: 'ខេត្តព្រះវិហារ', districts: [] },
  { province: 'ខេត្តព្រៃវែង', districts: [] },
  { province: 'ខេត្តពោធិ៍សាត់', districts: [] },
  { province: 'ខេត្តរតនគិរី', districts: [] },
  { province: 'ខេត្តព្រះសីហនុ', districts: [] },
  { province: 'ខេត្តស្ទឹងត្រែង', districts: [] },
  { province: 'ខេត្តស្វាយរៀង', districts: [] },
  { province: 'ខេត្តតាកែវ', districts: [] },
  { province: 'ខេត្តឧត្តរមានជ័យ', districts: [] },
  { province: 'ខេត្តកែប', districts: [] },
  { province: 'ខេត្តប៉ៃលិន', districts: [] },
  { province: 'ខេត្តត្បូងឃ្មុំ', districts: [] },
];

