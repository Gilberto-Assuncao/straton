import type { WorkforceMemberView, WorkforceTeamView } from "../types";
export const demoWorkforceMembers: WorkforceMemberView[] = [
  { id:"demo-member-1",name:"Maya Laurent",email:"maya@demo.straton",company:"Belnex Energy (Demo)",role:"manager",team:"Operations",employmentType:"employee",membershipStatus:"active",employmentStatus:"active",joinedAt:"2024-03-11",initials:"ML" },
  { id:"demo-member-2",name:"Lucas Martin",email:"lucas@demo.straton",company:"Belnex Energy (Demo)",role:"supervisor",team:"Engineering",employmentType:"employee",membershipStatus:"active",employmentStatus:"active",joinedAt:"2023-09-18",initials:"LM" },
  { id:"demo-member-3",name:"Sofia Dubois",email:"sofia@demo.straton",company:"Belnex Energy (Demo)",role:"contractor",team:"Design",employmentType:"freelancer",membershipStatus:"active",employmentStatus:"active",joinedAt:"2025-01-06",initials:"SD" },
  { id:"demo-member-4",name:"Emma Peeters",email:"emma@demo.straton",company:"Belnex Energy (Demo)",role:"employee",team:"Finance",employmentType:"employee",membershipStatus:"invited",employmentStatus:"pending",joinedAt:"2026-08-03",initials:"EP" },
  { id:"demo-member-5",name:"Noah Janssen",email:"noah@demo.straton",company:"Belnex Energy (Demo)",role:"employee",team:"Operations",employmentType:"temporary",membershipStatus:"suspended",employmentStatus:"leave",joinedAt:"2024-06-03",initials:"NJ" }
];
export const demoWorkforceTeams: WorkforceTeamView[] = [
  { id:"demo-team-1",name:"Operations",description:"Field delivery and site coordination.",leader:"Maya Laurent",memberCount:8,status:"active",currentUserRole:"member" },
  { id:"demo-team-2",name:"Engineering",description:"Technical design and project execution.",leader:"Lucas Martin",memberCount:6,status:"active" },
  { id:"demo-team-3",name:"Design",description:"Interior and visual design specialists.",leader:"Sofia Dubois",memberCount:4,status:"active" },
  { id:"demo-team-4",name:"Finance",description:"Reporting and accounting preparation.",leader:"Unassigned",memberCount:2,status:"inactive" }
];
