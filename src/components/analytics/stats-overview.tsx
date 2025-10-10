import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsOverviewProps {
  totalPredictions: number;
  winRate: number;
  dailyWins: number;
  weeklyWins: number;
  averageOdds: string;
  totalProfit: number;
  todaysPredictions: number;
}

export const StatsOverview = ({
  totalPredictions,
  winRate,
  dailyWins,
  weeklyWins,
  averageOdds,
  totalProfit,
  todaysPredictions
}: StatsOverviewProps) => {
  const stats = [
    {
      title: "Total Predictions",
      value: totalPredictions.toLocaleString(),
      icon: <Target className="w-5 h-5" />,
      color: "primary"
    },
    {
      title: "Win Rate",
      value: `${winRate}%`,
      icon: winRate >= 60 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
      color: winRate >= 60 ? "success" : "destructive",
      trend: winRate >= 60 ? "+2.3% vs last week" : "-1.2% vs last week"
    },
    {
      title: "Yesterday's Wins",
      value: `${dailyWins}/12`,
      icon: <BarChart3 className="w-5 h-5" />,
      color: dailyWins >= 8 ? "success" : dailyWins >= 6 ? "warning" : "destructive"
    },
    {
      title: "This Week",
      value: `${weeklyWins}/84`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "accent"
    },
    {
      title: "Avg Odds",
      value: averageOdds,
      icon: <BarChart3 className="w-5 h-5" />,
      color: "secondary"
    },
    {
      title: "Total Profit",
      value: totalProfit >= 0 ? `+$${totalProfit}` : `-$${Math.abs(totalProfit)}`,
      icon: totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
      color: totalProfit >= 0 ? "success" : "destructive"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title}
          className={cn(
            "p-4 hover:shadow-card-hover transition-all duration-300 hover:scale-105 bg-gradient-card border-border/50",
            "animate-fade-in"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className={cn(
                "p-2 rounded-lg",
                stat.color === "success" && "bg-success/10 text-success",
                stat.color === "destructive" && "bg-destructive/10 text-destructive",
                stat.color === "warning" && "bg-warning/10 text-warning",
                stat.color === "accent" && "bg-accent/10 text-accent",
                stat.color === "primary" && "bg-primary/10 text-primary",
                stat.color === "secondary" && "bg-secondary/50 text-secondary-foreground"
              )}>
                {stat.icon}
              </div>
              <Badge 
                variant={stat.color as any}
                className={cn(
                  "text-xs",
                  stat.color === "success" && "bg-gradient-success",
                  stat.color === "accent" && "bg-gradient-accent",
                  stat.color === "primary" && "bg-gradient-primary"
                )}
              >
                LIVE
              </Badge>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.title}
              </p>
              {stat.trend && (
                <p className={cn(
                  "text-xs mt-1",
                  stat.trend.startsWith('+') ? "text-success" : "text-destructive"
                )}>
                  {stat.trend}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};