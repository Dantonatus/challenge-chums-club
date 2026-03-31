import { Download, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DreamEntry } from '@/lib/dreams/types';
import { downloadMarkdown, downloadPDF } from '@/lib/dreams/exportDreams';
import { toast } from 'sonner';

interface Props {
  entries: DreamEntry[];
}

export function DreamExportMenu({ entries }: Props) {
  const handleMD = () => {
    if (!entries.length) return toast.error('Keine Träume zum Exportieren');
    downloadMarkdown(entries);
    toast.success('Markdown exportiert');
  };

  const handlePDF = () => {
    if (!entries.length) return toast.error('Keine Träume zum Exportieren');
    downloadPDF(entries);
    toast.success('PDF exportiert');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleMD} className="gap-2">
          <FileText className="w-4 h-4" /> Als Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} className="gap-2">
          <FileDown className="w-4 h-4" /> Als PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
