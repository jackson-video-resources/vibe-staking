import { Route, Switch } from "wouter";
import Layout from "./components/Layout.js";
import Dashboard from "./components/Dashboard.js";
import AuditLog from "./components/AuditLog.js";
import Settings from "./components/Settings.js";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/audit" component={AuditLog} />
        <Route path="/settings" component={Settings} />
      </Switch>
    </Layout>
  );
}
