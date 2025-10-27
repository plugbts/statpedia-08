import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Percent,
  Gift,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "free_trial";
  discount_value: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  usage_count: number;
}

interface PromoCodeUsage {
  id: string;
  promo_code: string;
  user_id: string;
  used_at: string;
  discount_type: string;
  discount_value: number;
  user_email?: string;
}

export const PromoCodesAdmin: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoUsage, setPromoUsage] = useState<PromoCodeUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "free_trial",
    discount_value: 0,
    expires_at: "",
    is_active: true,
  });

  // Load promo codes and usage data
  useEffect(() => {
    loadPromoCodes();
    loadPromoUsage();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get usage count for each promo code
      const codesWithUsage = await Promise.all(
        data.map(async (code: any) => {
          const { count } = await supabase
            .from("promo_code_usage")
            .select("*", { count: "exact", head: true })
            .eq("promo_code", code.code);

          return { ...code, usage_count: count || 0 };
        }),
      );

      setPromoCodes(codesWithUsage as any);
    } catch (error) {
      console.error("Error loading promo codes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromoUsage = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_code_usage")
        .select(
          `
          *,
          profiles:user_id(email)
        `,
        )
        .order("used_at", { ascending: false });

      if (error) throw error;

      setPromoUsage((data || []) as any);
    } catch (error) {
      console.error("Error loading promo usage:", error);
    }
  };

  const handleCreatePromoCode = async () => {
    try {
      const { error } = await supabase.from("promo_codes").insert({
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      });

      if (error) throw error;

      setShowCreateForm(false);
      setFormData({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        expires_at: "",
        is_active: true,
      });
      loadPromoCodes();
    } catch (error) {
      console.error("Error creating promo code:", error);
    }
  };

  const handleUpdatePromoCode = async () => {
    if (!editingCode) return;

    try {
      const { error } = await supabase
        .from("promo_codes")
        .update({
          code: formData.code.toUpperCase(),
          description: formData.description,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          expires_at: formData.expires_at || null,
          is_active: formData.is_active,
        })
        .eq("id", editingCode.id);

      if (error) throw error;

      setEditingCode(null);
      setFormData({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        expires_at: "",
        is_active: true,
      });
      loadPromoCodes();
    } catch (error) {
      console.error("Error updating promo code:", error);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);

      if (error) throw error;
      loadPromoCodes();
    } catch (error) {
      console.error("Error deleting promo code:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (code: PromoCode) => {
    if (!code.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Promo Codes Management</h2>
          <p className="text-muted-foreground">
            Create and manage promotional codes for discounts and free trials
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Promo Code
        </Button>
      </div>

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">Promo Codes</TabsTrigger>
          <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <div className="grid gap-4">
            {promoCodes.map((code) => (
              <Card key={code.id} className="bg-gradient-card border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{code.code}</CardTitle>
                      </div>
                      {getStatusBadge(code)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCode(code);
                          setFormData({
                            code: code.code,
                            description: code.description,
                            discount_type: code.discount_type,
                            discount_value: code.discount_value,
                            expires_at: code.expires_at || "",
                            is_active: code.is_active,
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePromoCode(code.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{code.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <div className="flex items-center gap-1 mt-1">
                        {code.discount_type === "percentage" ? (
                          <Percent className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Calendar className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm font-medium">
                          {code.discount_type === "percentage" ? "Percentage" : "Free Trial"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Value</Label>
                      <p className="text-sm font-medium mt-1">
                        {code.discount_type === "percentage"
                          ? `${code.discount_value}%`
                          : `${code.discount_value} days`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Usage Count</Label>
                      <p className="text-sm font-medium mt-1">{code.usage_count}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expires</Label>
                      <p className="text-sm font-medium mt-1">
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4">
            {promoUsage.map((usage) => (
              <Card key={usage.id} className="bg-gradient-card border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{usage.promo_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {usage.user_email || "Unknown User"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {usage.discount_type === "percentage"
                          ? `${usage.discount_value}% discount`
                          : `${usage.discount_value} day trial`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(usage.used_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingCode) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{editingCode ? "Edit Promo Code" : "Create Promo Code"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., WELCOME20"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Welcome discount for new users"
                />
              </div>

              <div>
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: "percentage" | "free_trial") =>
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="free_trial">Free Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount_value">
                  {formData.discount_type === "percentage" ? "Discount Percentage" : "Trial Days"}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_value: Number(e.target.value) })
                  }
                  placeholder={formData.discount_type === "percentage" ? "20" : "3"}
                />
              </div>

              <div>
                <Label htmlFor="expires_at">Expires At (Optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingCode ? handleUpdatePromoCode : handleCreatePromoCode}
                  className="flex-1"
                >
                  {editingCode ? "Update" : "Create"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCode(null);
                    setFormData({
                      code: "",
                      description: "",
                      discount_type: "percentage",
                      discount_value: 0,
                      expires_at: "",
                      is_active: true,
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
