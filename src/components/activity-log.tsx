"use client";

import type { LogEntry } from "@/lib/types";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLogProps {
  log: LogEntry[];
  isLoading: boolean;
}

export default function ActivityLog({ log, isLoading }: ActivityLogProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                log.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(entry.timestamp, "PPpp")}
                    </TableCell>
                    <TableCell>{entry.fullName}</TableCell>
                    <TableCell>{entry.schoolName}</TableCell>
                    <TableCell>
                      <Badge variant={entry.action === 'check-in' ? 'default' : 'secondary'} className="capitalize">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-primary inline-block" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 inline-block" />
                      )}
                    </TableCell>
                    <TableCell>{entry.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
