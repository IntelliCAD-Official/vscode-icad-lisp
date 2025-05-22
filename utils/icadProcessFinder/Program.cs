﻿using System;
using System.Diagnostics;
using System.Text;

namespace IntelliCAD.IcadExt
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                string acadExeName = "icad";

                if ((args != null) && (args.Length == 1))
                    acadExeName = args[0];

                FindIcadProcesses(acadExeName);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex.Message);
            }
        }

        private static void FindIcadProcesses(string acadExeName)
        {
            Console.OutputEncoding = Encoding.UTF8;

            var allProcesses = Process.GetProcessesByName(acadExeName);
            StringBuilder sb = new StringBuilder();

            if (allProcesses != null)
            {
                foreach (var proc in allProcesses)
                {
                    try
                    {
                        if (proc.MainModule == null)
                            continue;

                        if (string.IsNullOrWhiteSpace(proc.MainModule.FileName))
                            continue;

                        var startTime = proc.StartTime;
                        var args = proc.StartInfo.Arguments;
                        var pid = proc.Id;
                        var title = proc.MainWindowTitle ?? "";

                        sb.AppendLine(string.Format("{0}\t{1}\t{2}\t{3}\t{4}",
                                                proc.MainModule.FileName.Replace("\t", "    "),
                                                startTime.Ticks,
                                                args.Replace("\t", "    "),
                                                pid,
                                                title)
                                     );
                    }
                    catch (System.ComponentModel.Win32Exception)
                    {
                        //ignore exception of System.ComponentModel.Win32Exception which is thrown on accessibility problem
                    }
                }
            }

            Console.WriteLine(sb.ToString());
        }
    }
}
