{{/*
Expand the name of the chart.
*/}}
{{- define "weather-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "weather-app.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "weather-app.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
