import { StatCard } from "@/components/admin/StatCard";
import { 
  DollarSign, Users, ShoppingCart, Activity, Package, 
  Megaphone, Newspaper, FileText, ArrowRight, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { useDbProducts } from "@/hooks/use-db-products";
import { useMemo } from "react";
import { adminPath } from "@/lib/subdomain";

const adPerformanceData = [
  { name: "Mon", clicks: 400, views: 2400 },
  { name: "Tue", clicks: 300, views: 1398 },
  { name: "Wed", clicks: 200, views: 9800 },
  { name: "Thu", clicks: 278, views: 3908 },
  { name: "Fri", clicks: 189, views: 4800 },
  { name: "Sat", clicks: 239, views: 3800 },
  { name: "Sun", clicks: 349, views: 4300 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: dbProducts } = useDbProducts();

  const inventoryData = useMemo(() => {
    if (!dbProducts) return [];
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    dbProducts.forEach(p => {
      const stock = Number(p.stock ?? 50);
      if (stock === 0) outOfStock++;
      else if (stock < 15) lowStock++;
      else inStock++;
    });

    return [
      { name: "In Stock", value: inStock, color: "#10b981" },
      { name: "Low Stock", value: lowStock, color: "#f59e0b" },
      { name: "Out of Stock", value: outOfStock, color: "#ef4444" },
    ];
  }, [dbProducts]);

  const stats = [
    {
      label: "Total Revenue",
      value: "$0.00",
      icon: DollarSign,
      trend: { value: 0, isPositive: true },
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Subscriptions",
      value: "0",
      icon: Users,
      trend: { value: 0, isPositive: true },
      iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Sales",
      value: "0",
      icon: ShoppingCart,
      trend: { value: 0, isPositive: true },
      iconBg: "bg-amber-500/10 text-amber-500",
    },
    {
      label: "Active Now",
      value: "0",
      icon: Activity,
      trend: { value: 0, isPositive: true },
      iconBg: "bg-rose-500/10 text-rose-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's what's happening with your store today.
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            iconBg={stat.iconBg}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Site Front Advertising - Middle Large Area */}
        <Card className="md:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" />
                Site Front Advertising
              </CardTitle>
              <CardDescription>Current campaign performance and reach</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={adminPath("/admin/sla/site-advertising")} className="flex items-center gap-1">
                Manage Ads <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Inventory - Right Side */}
        <Card className="md:col-span-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(adminPath('/admin/inventory'))}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Inventory
              </CardTitle>
              <CardDescription>Stock status summary</CardDescription>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {inventoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Broadcast News & Updates - Bottom Left */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-orange-600">
                <Newspaper className="h-5 w-5" />
                Broadcast News & Updates
              </CardTitle>
              <CardDescription>Updated news & Announcement</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="border-orange-200 hover:bg-orange-100 text-orange-700">
              <Link to={adminPath("/admin/sla/broadcast-news")}>Manage News</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/50 border border-orange-100">
                <p className="text-sm font-medium text-orange-900">Can release system wise notifications</p>
                <p className="text-xs text-orange-700 mt-1">Broadcast important updates to all resellers and staff members instantly.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-orange-600 font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>3 Active Announcements</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content - Bottom Right */}
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-yellow-700">
                <FileText className="h-5 w-5" />
                Content Management
              </CardTitle>
              <CardDescription>Contents like FAQs, Terms, etc..</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="border-yellow-200 hover:bg-yellow-100 text-yellow-800">
              <Link to={adminPath("/admin/content")}>Edit Content</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/50 border border-yellow-100 text-center">
                <span className="text-xl font-bold text-yellow-800">12</span>
                <p className="text-[10px] text-yellow-700 uppercase font-bold mt-1">FAQs</p>
              </div>
              <div className="p-3 rounded-lg bg-white/50 border border-yellow-100 text-center">
                <span className="text-xl font-bold text-yellow-800">5</span>
                <p className="text-[10px] text-yellow-700 uppercase font-bold mt-1">Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
