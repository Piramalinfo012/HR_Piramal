const normalize = (value) => (value || '').toString().trim().toLowerCase();

const recruitmentKeywords = [
  'recruitment',
  'indent',
  'online posting',
  'call tracker',
  'interview',
  'candidate',
  'verification',
  'joining follow up',
];

export const getUserRole = (user = {}) => {
  const explicitRole = [
    user.role,
    user.Role,
    user['User Role'],
    user['User Type'],
    user.Type,
    user['ID Type'],
    user.IDType,
  ]
    .map(normalize)
    .find(Boolean);

  if (normalize(user.Admin || user.admin) === 'yes') return 'admin';
  if (['admin', 'administrator'].includes(explicitRole)) return 'admin';
  if (['recruiter', 'hr recruiter', 'recruitment'].includes(explicitRole)) return 'recruiter';
  if (['employee', 'staff', 'user'].includes(explicitRole)) return 'employee';

  const pageAccess = normalize(user['Pages Access'] || user.pagesAccess || user.PageAccess);
  if (recruitmentKeywords.some((keyword) => pageAccess.includes(keyword))) {
    return 'recruiter';
  }

  return 'employee';
};

export const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
