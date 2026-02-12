import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";

const TARGET_USER_ID = "1d73ca6e-250f-40df-83d3-8bb905e0d01c";

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any[]> | null>(null);
  const [taskResult, setTaskResult] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n');
    let jsonStr = lines.slice(1).join('\n').trim();
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
      jsonStr = jsonStr.slice(1, -1);
    }
    jsonStr = jsonStr.replace(/""/g, '"');
    return JSON.parse(jsonStr);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setResults(null);
    setTaskResult(null);

    try {
      const data = await parseFile(file);
      console.log("Parsed tables:", Object.keys(data));
      setParsedData(data);

      // Run general import
      const { data: result, error: fnError } = await supabase.functions.invoke('import-data', {
        body: data,
      });

      if (fnError) throw fnError;
      setResults(result.results);

      // Auto-import tasks with dedicated function
      if (data.tasks && data.tasks.length > 0) {
        setTaskResult("⏳ Importiere Tasks...");
        const { data: taskRes, error: taskErr } = await supabase.functions.invoke('import-tasks', {
          body: { tasks: data.tasks, target_user_id: TARGET_USER_ID },
        });

        if (taskErr) {
          setTaskResult(`❌ Tasks Fehler: ${taskErr.message}`);
        } else {
          setTaskResult(`✅ Tasks: ${taskRes.imported}/${taskRes.total} importiert${taskRes.errors > 0 ? `, ${taskRes.errors} Fehler` : ''}`);
          if (taskRes.sampleErrors?.length > 0) {
            console.error("Task import errors:", taskRes.sampleErrors);
          }
        }
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleTasksOnly = async () => {
    if (!parsedData?.tasks) return;
    setTaskResult("⏳ Importiere Tasks...");
    try {
      const { data: taskRes, error: taskErr } = await supabase.functions.invoke('import-tasks', {
        body: { tasks: parsedData.tasks, target_user_id: TARGET_USER_ID },
      });
      if (taskErr) throw taskErr;
      setTaskResult(`✅ Tasks: ${taskRes.imported}/${taskRes.total} importiert${taskRes.errors > 0 ? `, ${taskRes.errors} Fehler` : ''}`);
    } catch (err: any) {
      setTaskResult(`❌ ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>📦 Daten Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Lade die exportierte CSV-Datei aus deiner alten Datenbank hoch.
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importing}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
          />

          {importing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Importiere Daten...</span>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              <XCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {taskResult && (
            <div className="bg-muted p-3 rounded-md text-sm font-medium">
              {taskResult}
            </div>
          )}

          {parsedData?.tasks && (
            <Button onClick={handleTasksOnly} variant="outline" size="sm">
              🔄 Tasks erneut importieren ({parsedData.tasks.length} Tasks)
            </Button>
          )}

          {results && (
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Ergebnis:</h3>
              {Object.entries(results).map(([table, status]) => (
                <div key={table} className="flex justify-between text-xs py-1 border-b border-border">
                  <span className="font-mono">{table}</span>
                  <span className={status.startsWith('error') ? 'text-destructive' : 'text-green-600'}>
                    {status.startsWith('error') ? <XCircle className="h-3 w-3 inline mr-1" /> : <CheckCircle className="h-3 w-3 inline mr-1" />}
                    {status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
