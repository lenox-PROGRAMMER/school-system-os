import { BookOpen, FileText, Award, Building2, DollarSign, Bell, Menu } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface StudentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: FileText },
  { id: "grades", label: "Grades", icon: Award },
  { id: "hostel", label: "Hostel Booking", icon: Building2 },
  { id: "payments", label: "Fee Payments", icon: DollarSign },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export function StudentSidebar({ activeTab, onTabChange }: StudentSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Student Portal
          </h2>
          <SidebarTrigger className="text-sidebar-foreground">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    isActive={activeTab === item.id}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
