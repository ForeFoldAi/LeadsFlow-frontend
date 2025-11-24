import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, CheckCircle, TrendingUp } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    totalLeads: number;
    hotLeads: number;
    converted: number;
    conversionRate: string;
  }>({
    queryKey: ["/api/leads/stats/summary"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-primary",
      testId: "stats-total-leads"
    },
    {
      title: "Hot Leads",
      value: stats?.hotLeads || 0,
      icon: Flame,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      testId: "stats-hot-leads"
    },
    {
      title: "Converted",
      value: stats?.converted || 0,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      testId: "stats-converted"
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || "0.0"}%`,
      icon: TrendingUp,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      testId: "stats-conversion-rate"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat) => (
        <Card key={stat.title} className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`${stat.iconColor} text-lg`} size={20} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p 
                  className="text-2xl font-bold text-gray-900" 
                  data-testid={stat.testId}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
