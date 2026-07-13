import {
  LayoutDashboard,
  Newspaper,
  Megaphone,
  Image as ImageIcon,
  FileText,
  CalendarDays,
  BarChart3,
  MessageSquareWarning,
  MessageCircle,
  Briefcase,
  Users,
  Building2,
  Receipt,
  Phone,
  History,
  Home,
  Bell as BellIcon,
  UserCircle,
  Mail,
  MoreHorizontal,
  Globe,
  Settings2,
  Languages,
} from "lucide-react";

// Grouped so ~13 sections don't read as one flat wall of links. Badge counts
// are filled in at runtime by AppShell (pending approvals, open grievances,
// unread contact messages, unread member-to-member messages) so the sidebar
// itself surfaces what needs attention.
export const ADMIN_NAV = [
  {
    group: "Overview",
    groupKey: "groupOverview",
    items: [{ label: "Dashboard", key: "dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    group: "Messages",
    groupKey: "groupMessages",
    items: [{ label: "Messages", key: "messages", href: "/admin/messages", icon: MessageCircle, badgeKey: "messages" }],
  },
  {
    group: "Content",
    groupKey: "groupContent",
    items: [
      { label: "Updates & news", key: "updatesNews", href: "/admin/updates", icon: Newspaper },
      { label: "Notices", key: "notices", href: "/admin/notices", icon: Megaphone },
      { label: "Gallery", key: "gallery", href: "/admin/gallery", icon: ImageIcon },
      { label: "Documents", key: "documents", href: "/admin/documents", icon: FileText },
    ],
  },
  {
    group: "Community",
    groupKey: "groupCommunity",
    items: [
      { label: "Workshops", key: "workshops", href: "/admin/workshops", icon: CalendarDays },
      { label: "Polls & feedback", key: "pollsFeedback", href: "/admin/polls", icon: BarChart3 },
      { label: "Grievances", key: "grievances", href: "/admin/grievances", icon: MessageSquareWarning, badgeKey: "grievances" },
      { label: "Vacancies", key: "vacancies", href: "/admin/vacancies", icon: Briefcase },
    ],
  },
  {
    group: "People",
    groupKey: "groupPeople",
    items: [
      { label: "Members", key: "members", href: "/admin/members", icon: Users, badgeKey: "pendingMembers" },
      { label: "Directory", key: "directory", href: "/admin/industries", icon: Building2 },
      { label: "Dues", key: "dues", href: "/admin/dues", icon: Receipt },
    ],
  },
  {
    group: "System",
    groupKey: "groupSystem",
    items: [
      { label: "Emergency & ratings", key: "emergencyRatings", href: "/admin/emergency", icon: Phone },
      { label: "Contact messages", key: "contactMessages", href: "/admin/contact", icon: Mail, badgeKey: "contact" },
      { label: "Audit log", key: "auditLog", href: "/admin/audit-log", icon: History },
    ],
  },
  {
    group: "Website",
    groupKey: "groupWebsite",
    items: [
      { label: "Site content", key: "siteContent", href: "/admin/site-content", icon: Globe },
      { label: "Site settings", key: "siteSettings", href: "/admin/site-settings", icon: Settings2 },
      { label: "Translations", key: "translations", href: "/admin/translations", icon: Languages },
    ],
  },
];

// Member dashboard is intentionally flat and short — this is what sits in the
// mobile bottom nav, so six destinations (thumb-reachable) is the ceiling.
// Messages earned a primary slot alongside Notices since it's checked as
// often; Grievances/dues/documents are one tap further via "More" instead —
// they're checked far less often than these five.
export const MEMBER_NAV = [
  { label: "Home", key: "home", href: "/dashboard", icon: Home },
  { label: "Workshops", key: "workshops", href: "/dashboard/workshops", icon: CalendarDays },
  { label: "Notices", key: "notices", href: "/dashboard/notices", icon: BellIcon },
  { label: "Messages", key: "messages", href: "/dashboard/messages", icon: MessageCircle, badgeKey: "messages" },
  { label: "My business", key: "myBusiness", href: "/dashboard/business", icon: UserCircle },
  { label: "More", key: "more", href: "/dashboard/more", icon: MoreHorizontal },
];
