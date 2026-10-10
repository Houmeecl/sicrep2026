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
import Preinscripcion from "@/pages/preinscripcion/Preinscripcion";
import PreinscripcionEstado from "@/pages/preinscripcion/Estado";
import Verificar from "@/pages/preinscripcion/Verificar";
import AdminPreinscripciones from "@/pages/admin/Preinscripciones";

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
          <Route path="/preinscripcion" component={Preinscripcion} />
          <Route path="/preinscripcion/estado" component={PreinscripcionEstado} />
          <Route path="/verificar/:code" component={Verificar} />
          <Route path="/admin/preinscripciones" component={AdminPreinscripciones} />
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
