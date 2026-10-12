import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Looper;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Labels {
  static class App {
    final String name;
    final String packageName;

    App(String name, String packageName) {
      this.name = name;
      this.packageName = packageName;
    }
  }

  static String clean(CharSequence s) {
    return String.valueOf(s).replace('\t', ' ').replace('\n', ' ');
  }

  static void printTable(PrintStream out, List<App> apps) {
    int nameWidth = "Name".length();
    for (App app : apps) {
      nameWidth = Math.max(nameWidth, app.name.length());
    }

    out.printf("%-" + nameWidth + "s  %s%n", "Name", "Package");
    StringBuilder separator = new StringBuilder(nameWidth);
    for (int i = 0; i < nameWidth; i++) {
      separator.append('-');
    }
    out.printf("%-" + nameWidth + "s  %s%n", separator, "-------");
    for (App app : apps) {
      out.printf("%-" + nameWidth + "s  %s%n", app.name, app.packageName);
    }
  }

  static void printList(PrintStream out, List<App> apps) {
    for (App app : apps) {
      out.printf("%s\t%s%n", app.name, app.packageName);
    }
  }

  public static void main(String[] args) {
    try {
      boolean all = false;
      boolean list = false;
      for (String arg : args) {
        if (arg.equals("all")) all = true;
        if (arg.equals("--list")) list = true;
      }

      Looper.prepareMainLooper();

      Class<?> at = Class.forName("android.app.ActivityThread");
      Object thread = at.getDeclaredMethod("systemMain").invoke(null);
      Context ctx = (Context) at.getDeclaredMethod("getSystemContext").invoke(thread);
      PackageManager pm = ctx.getPackageManager();

      PrintStream out = new PrintStream(System.out, false, "UTF-8");
      List<App> apps = new ArrayList<>();

      if (all) {
        for (PackageInfo pi : pm.getInstalledPackages(0)) {
          ApplicationInfo ai = pi.applicationInfo;
          apps.add(new App(clean(ai.loadLabel(pm)), pi.packageName));
        }
      } else {
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        Set<String> seen = new HashSet<>();
        for (ResolveInfo ri : pm.queryIntentActivities(main, 0)) {
          ApplicationInfo ai = ri.activityInfo.applicationInfo;
          if (!seen.add(ai.packageName)) continue;
          apps.add(new App(clean(ri.loadLabel(pm)), ai.packageName));
        }
      }

      if (list) {
        printList(out, apps);
      } else {
        printTable(out, apps);
      }
      out.flush();
      System.exit(0);
    } catch (Throwable t) {
      t.printStackTrace();
      System.exit(1);
    }
  }
}