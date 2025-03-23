export interface UserInfo {
  [uid: string]: UserInfoDetail;
}

export interface UserInfoDetail {
  engName: string;
  chnName: string;
  address: string;
  dob: string;
  email: string;
  tel: string;
  empDate: string;
  empStatus: string;
  empType: string;
  empNo: string;
  empPost: string;
  basicSalary: number;
  compMpfRate: number;
  staffMpfRate: number;
  sickLeave: number;
  annualLeave: number;
  annualLeaveCalcDate: string;
  lastLeftLeave: number;
}

export interface RosterDetail {
  shift: string;
  leaveType?: string;
  start: string;
  end: string;
}

export interface Roster {
  [date: string]: RosterDetail;
}
export interface UserRoster {
  [uid: string]: Roster;
}

export interface AttendanceDetail {
  workTime: string;
  workType: string;
  leaveTime: string;
  leaveType: string;
}

export interface Attendance {
  [date: string]: AttendanceDetail;
}
export interface UserAttendance {
  [uid: string]: Attendance;
}

export interface ShiftDetail {
  name: string;
  start: string;
  end: string;
}

export interface ShiftDetailWithId extends ShiftDetail {
  id?: string;
}

export interface Shift {
  [id: string]: ShiftDetail;
}

export interface PeriodWeek {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
}

export interface PeriodDetail extends PeriodWeek {
  name: string;
  publicHoliday: boolean;
}

export interface PeriodDetailWithId extends PeriodDetail {
  id?: string;
}

export interface Period {
  [id: string]: PeriodDetail;
}

export interface ApprovalDetail {
  empID: string;
  type: string;
  start: string;
  end: string;
  apply: string;
  status: string;
  reason: string;
}

export interface Approval {
  [id: string]: ApprovalDetail;
}

export interface AdjustmentDetail {
  empID: string;
  start: string;
  apply: string;
  status: string;
  reason: string;
}

export interface Adjustment {
  [id: string]: AdjustmentDetail;
}

export interface Announcement {
  [id: string]: AnnouncementDetail;
}

export interface AnnouncementDetail {
  title: string;
  content: string;
  createAt: string;
  updateAt: string;
}

export interface TodoDetail {
  color: string;
  description: string;
  start: string;
  end: string;
  readonly: boolean;
}

export interface Todo {
  [id: string]: TodoDetail;
}

export interface SalaryDetail {
  bonus: number;
}

export interface Salary {
  [date: string]: SalaryDetail;
}

export interface UserSalary {
  [uid: string]: Salary;
}

export interface Chat {
  [id: string]: ChatDetail;
}

export interface ChatDetail {
  name?: string;
  iconUrl: string;
  isGroup: boolean;
  members: {
    [uid: string]: boolean;
  };
  lastMsg: string;
  lastMsgTime: number;
}

export interface Message {
  [id: string]: MessageDetail;
}

export interface MessageDetail {
  content: string;
  senderId: string;
  timestamp: number;
}
