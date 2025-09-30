import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { betTrackingService, type UserBankroll } from '@/services/bet-tracking-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BankrollManagementProps {
  bankrolls: UserBankroll[];
  onBankrollUpdate: () => void;
  selectedBankroll: UserBankroll | null;
  onBankrollSelect: (bankroll: UserBankroll) => void;
}

export const BankrollManagement: React.FC<BankrollManagementProps> = ({
  bankrolls,
  onBankrollUpdate,
  selectedBankroll,
  onBankrollSelect
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingBankroll, setEditingBankroll] = useState<UserBankroll | null>(null);
  const [deletingBankroll, setDeletingBankroll] = useState<UserBankroll | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    bankroll_name: '',
    initial_amount: '',
    currency: 'USD'
  });

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateProfit = (bankroll: UserBankroll) => {
    return bankroll.current_amount - bankroll.initial_amount;
  };

  const calculateProfitPercentage = (bankroll: UserBankroll) => {
    return ((bankroll.current_amount - bankroll.initial_amount) / bankroll.initial_amount) * 100;
  };

  const handleCreateBankroll = async () => {
    if (!formData.bankroll_name || !formData.initial_amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await betTrackingService.createBankroll({
        user_id: user.id,
        bankroll_name: formData.bankroll_name,
        initial_amount: parseFloat(formData.initial_amount),
        current_amount: parseFloat(formData.initial_amount),
        currency: formData.currency,
        is_active: true
      });

      toast({
        title: "Success",
        description: "Bankroll created successfully"
      });

      setShowCreateForm(false);
      setFormData({ bankroll_name: '', initial_amount: '', currency: 'USD' });
      onBankrollUpdate();
    } catch (error) {
      console.error('Failed to create bankroll:', error);
      toast({
        title: "Error",
        description: "Failed to create bankroll",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBankroll = async () => {
    if (!editingBankroll || !formData.bankroll_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await betTrackingService.updateBankroll(editingBankroll.id, {
        bankroll_name: formData.bankroll_name,
        currency: formData.currency
      });

      toast({
        title: "Success",
        description: "Bankroll updated successfully"
      });

      setShowEditForm(false);
      setEditingBankroll(null);
      setFormData({ bankroll_name: '', initial_amount: '', currency: 'USD' });
      onBankrollUpdate();
    } catch (error) {
      console.error('Failed to update bankroll:', error);
      toast({
        title: "Error",
        description: "Failed to update bankroll",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBankroll = async () => {
    if (!deletingBankroll) return;

    try {
      setIsLoading(true);
      await betTrackingService.updateBankroll(deletingBankroll.id, {
        is_active: false
      });

      toast({
        title: "Success",
        description: "Bankroll deleted successfully"
      });

      setShowDeleteDialog(false);
      setDeletingBankroll(null);
      onBankrollUpdate();
    } catch (error) {
      console.error('Failed to delete bankroll:', error);
      toast({
        title: "Error",
        description: "Failed to delete bankroll",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditForm = (bankroll: UserBankroll) => {
    setEditingBankroll(bankroll);
    setFormData({
      bankroll_name: bankroll.bankroll_name,
      initial_amount: bankroll.initial_amount.toString(),
      currency: bankroll.currency
    });
    setShowEditForm(true);
  };

  const openDeleteDialog = (bankroll: UserBankroll) => {
    setDeletingBankroll(bankroll);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bankroll Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your betting bankrolls and track performance
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Bankroll
        </Button>
      </div>

      {/* Bankroll Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankrolls.map((bankroll) => {
          const profit = calculateProfit(bankroll);
          const profitPercentage = calculateProfitPercentage(bankroll);
          const isProfit = profit >= 0;

          return (
            <Card 
              key={bankroll.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedBankroll?.id === bankroll.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onBankrollSelect(bankroll)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{bankroll.bankroll_name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(bankroll);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(bankroll);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(bankroll.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Amount</span>
                    <span className="font-semibold">
                      {formatCurrency(bankroll.current_amount, bankroll.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Initial Amount</span>
                    <span className="text-sm">
                      {formatCurrency(bankroll.initial_amount, bankroll.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Profit/Loss</span>
                    <div className="flex items-center gap-1">
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`font-semibold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(profit, bankroll.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ROI</span>
                    <Badge variant={isProfit ? "default" : "destructive"}>
                      {profitPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Bankroll Form */}
      <AlertDialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Bankroll</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new bankroll to track your betting performance
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankroll_name">Bankroll Name</Label>
              <Input
                id="bankroll_name"
                value={formData.bankroll_name}
                onChange={(e) => setFormData({ ...formData, bankroll_name: e.target.value })}
                placeholder="e.g., Main Bankroll, Sports Betting"
              />
            </div>
            <div>
              <Label htmlFor="initial_amount">Initial Amount</Label>
              <Input
                id="initial_amount"
                type="number"
                step="0.01"
                value={formData.initial_amount}
                onChange={(e) => setFormData({ ...formData, initial_amount: e.target.value })}
                placeholder="1000.00"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateBankroll} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Bankroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Bankroll Form */}
      <AlertDialog open={showEditForm} onOpenChange={setShowEditForm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Bankroll</AlertDialogTitle>
            <AlertDialogDescription>
              Update your bankroll information
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_bankroll_name">Bankroll Name</Label>
              <Input
                id="edit_bankroll_name"
                value={formData.bankroll_name}
                onChange={(e) => setFormData({ ...formData, bankroll_name: e.target.value })}
                placeholder="e.g., Main Bankroll, Sports Betting"
              />
            </div>
            <div>
              <Label htmlFor="edit_currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditBankroll} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Bankroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bankroll</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBankroll?.bankroll_name}"? 
              This action cannot be undone and will deactivate the bankroll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBankroll} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete Bankroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
