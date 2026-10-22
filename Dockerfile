FROM node:22-alpine AS frontend
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/FracGen.Api/FracGen.Api.csproj backend/FracGen.Api/
RUN dotnet restore backend/FracGen.Api/FracGen.Api.csproj
COPY backend/FracGen.Api/ backend/FracGen.Api/
COPY --from=frontend /web/dist/ backend/FracGen.Api/wwwroot/
RUN dotnet publish backend/FracGen.Api/FracGen.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=backend /out/ ./
ENTRYPOINT ["dotnet", "FracGen.Api.dll"]
