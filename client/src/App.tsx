import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import Landing from "@/pages/Landing";
import Convocatoria from "@/pages/Convocatoria";
import ConvocatoriaRetorno from "@/pages/ConvocatoriaRetorno";
import Postular from "@/pages/Postular";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ProviderDashboard from "@/pages/provider/Dashboard";
import CompanyDashboard from "@/pages/company/Dashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/convocatoria" component={Convocatoria} />
          <Route path="/convocatoria/retorno" component={ConvocatoriaRetorno} />
          <Route path="/postular" component={Postular} />
          <Route path="/login" component={Login} />
          <Route path="/registro" component={Register} />
          <Route path="/app" component={ProviderDashboard} />
          <Route path="/empresa" component={CompanyDashboard} />
          <Route component={NotFound} />
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}
