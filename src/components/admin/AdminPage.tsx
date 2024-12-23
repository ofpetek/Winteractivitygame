import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { WeekForm } from './WeekForm';
import { WeekManager } from './WeekManager';
import { adminService } from '../../lib/firebase/admin-service';
import type { Week } from '../../lib/schemas';

function WeekList() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isAddingWeek, setIsAddingWeek] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadWeeks();
  }, []);

  const loadWeeks = async () => {
    try {
      const fetchedWeeks = await adminService.getAllWeeks();
      setWeeks(fetchedWeeks as Week[]);
    } catch (error) {
      console.error('Error loading weeks:', error);
      // You might want to show an error message to the user here
      setWeeks([]); // Set empty array on error
    }
  };

  const handleWeekAdded = () => {
    setIsAddingWeek(false);
    loadWeeks();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => setIsAddingWeek(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Week
        </Button>
      </div>

      {isAddingWeek && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Week</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekForm onComplete={handleWeekAdded} onCancel={() => setIsAddingWeek(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {weeks.map((week) => (
          <Card key={week.id}>
            <CardHeader>
              <CardTitle>Week {week.weekNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{week.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">
                  {week.practices.length} Practice{week.practices.length !== 1 ? 's' : ''}
                </span>
                <Button variant="outline" onClick={() => navigate(`/admin/weeks/${week.id}`)}>
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  return (
    <Routes>
      <Route path="/" element={<WeekList />} />
      <Route path="/weeks/:weekId" element={<WeekManager />} />
    </Routes>
  );
}
