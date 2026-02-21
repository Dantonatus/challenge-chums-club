import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Scale, Heart, Droplets, Flame, Activity } from 'lucide-react';

interface Tab {
  value: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface Props {
  tabs: Tab[];
  defaultValue?: string;
}

export default function WeightTabs({ tabs, defaultValue = 'overview' }: Props) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export { Scale, Heart, Droplets, Flame, Activity };
