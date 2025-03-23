// All routes that required permission
const permissionRoutes = () => {
  return [
    {
      path: '/',
      name: 'entry',
      redirect: '/home',
      meta: { role: ['user', 'admin'], hidden: true },
    },
    {
      path: '/home', // Path of the page
      name: 'home', // Name of the page
      component: () => import('@/views/HomePage.vue'), // Import the component
      meta: {
        role: ['user', 'admin'], // Define which role can access this page
        name: '主頁', // Name that show at side navigation bar
        icon: 'mdi-home', // Icon that show at side navigation bar
        hidden: false, // Define whether this page is hidden from side navigation bar
      },
    },
    {
      path: '/company',
      name: 'company',
      component: () => import('@/views/company/CompanyIndex.vue'),
      meta: {
        role: ['user', 'admin'],
        name: '公司',
        icon: 'mdi-office-building',
        hidden: false,
      },
    },
    {
      path: '/announcement',
      name: 'announcement',
      component: () => import('@/views/announcement/AnnouncementIndex.vue'),
      meta: {
        role: ['user', 'admin'],
        name: '公告',
        icon: 'mdi-bullhorn-outline',
        hidden: false,
      },
    },
    {
      path: '/employees',
      name: 'employees',
      component: () => import('@/views/employee/EmployeeIndex.vue'),
      meta: {
        role: ['admin'],
        name: '員工',
        icon: 'mdi-account',
        hidden: false,
      },
    },
    {
      path: '/attendance',
      name: 'attendance',
      redirect: '/record',
      meta: {
        role: ['user', 'admin'],
        name: '考勤',
        icon: 'mdi-alarm',
        hidden: false,
      },
      children: [
        {
          path: '/punch',
          name: 'punch',
          component: () => import('@/views/attendance/punch/PunchUser.vue'),
          meta: {
            role: ['user'],
            name: '打卡',
            icon: 'mdi-map-marker-radius',
            hidden: false,
          },
        },
        {
          path: '/record',
          name: 'record',
          component: () => import('@/views/attendance/record/RecordIndex.vue'),
          meta: {
            role: ['user', 'admin'],
            name: '記錄',
            icon: 'mdi-note-edit',
            hidden: false,
          },
        },
        {
          path: '/roster',
          name: 'roster',
          component: () => import('@/views/attendance/roster/RosterIndex.vue'),
          meta: {
            role: ['user', 'admin'],
            name: '更表',
            icon: 'mdi-list-box-outline',
            hidden: false,
          },
        },
        {
          path: '/location',
          name: 'location',
          component: () => import('@/views/attendance/location/LocationAdmin.vue'),
          meta: {
            role: ['admin'],
            name: '位置',
            icon: 'mdi-office-building-marker',
            hidden: false,
          },
        },
      ],
    },
    {
      path: '/approval',
      name: 'approval',
      redirect: '/leave',
      meta: {
        role: ['user', 'admin'],
        name: '審批',
        icon: 'mdi-stamper',
        hidden: false,
      },
      children: [
        {
          path: '/leave',
          name: 'leave',
          component: () => import('@/views/approval/leave/LeaveIndex.vue'),
          meta: {
            role: ['user', 'admin'],
            name: '請假',
            icon: 'mdi-home-clock',
            hidden: false,
          },
        },
        {
          path: '/overtime',
          name: 'overtime',
          component: () => import('@/views/approval/overtime/OvertimeIndex.vue'),
          meta: {
            role: ['user', 'admin'],
            name: '加班',
            icon: 'mdi-desk-lamp',
            hidden: false,
          },
        },
        {
          path: '/adjustment',
          name: 'adjustment',
          component: () => import('@/views/approval/adjustment/AdjustmentIndex.vue'),
          meta: {
            role: ['user', 'admin'],
            name: '補卡',
            icon: 'mdi-clock-alert-outline',
            hidden: false,
          },
        },
      ],
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/chat/ChatList.vue'),
      meta: {
        role: ['user', 'admin'],
        name: '聊天',
        icon: 'mdi-chat-processing-outline',
        hidden: false,
      },
      children: [
        {
          path: '/chat/:chatId',
          name: 'chatRoom',
          component: () => import('@/views/chat/ChatRoom.vue'),
          meta: {
            role: ['user', 'admin'],

            hidden: true,
          },
        },
        {
          path: '/chat/new/:uid',
          name: 'newChatRoom',
          component: () => import('@/views/chat/ChatRoom.vue'),
          meta: {
            role: ['user', 'admin'],
            hidden: true,
          },
        },
      ],
    },
  ];
};

export default permissionRoutes;
