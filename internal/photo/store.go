package photo

import (
	"bytes"
	"context"
	"errors"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"
)

type Store interface {
	Put(context.Context, string, []byte, string) error
	Get(context.Context, string) (io.ReadCloser, error)
	Delete(context.Context, string) error
}
type S3Store struct {
	Client *s3.Client
	Bucket string
}

func FromEnv() (Store, error) {
	bucket := os.Getenv("S3_BUCKET")
	endpoint := os.Getenv("S3_ENDPOINT")
	key := os.Getenv("S3_ACCESS_KEY_ID")
	secret := os.Getenv("S3_SECRET_ACCESS_KEY")
	if bucket == "" && endpoint == "" && key == "" && secret == "" {
		return nil, nil
	}
	if bucket == "" || key == "" || secret == "" {
		return nil, errors.New("S3_BUCKET and S3 credentials required")
	}
	region := os.Getenv("S3_REGION")
	if region == "" {
		region = "us-east-1"
	}
	pathStyle := false
	if value := os.Getenv("S3_PATH_STYLE"); value != "" {
		var err error
		pathStyle, err = strconv.ParseBool(value)
		if err != nil {
			return nil, errors.New("invalid S3_PATH_STYLE")
		}
	}
	return NewS3(endpoint, region, bucket, key, secret, pathStyle)
}
func NewS3(endpoint, region, bucket, key, secret string, pathStyle bool) (Store, error) {
	if endpoint != "" {
		u, e := url.Parse(endpoint)
		if e != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
			return nil, errors.New("invalid S3_ENDPOINT")
		}
	}
	cfg := aws.Config{Region: region, Credentials: credentials.NewStaticCredentialsProvider(key, secret, ""), HTTPClient: &http.Client{Timeout: 20 * time.Second}, RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired, ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired}
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = pathStyle
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
		}
	})
	return &S3Store{client, bucket}, nil
}
func (s *S3Store) Put(ctx context.Context, key string, data []byte, kind string) error {
	_, err := s.Client.PutObject(ctx, &s3.PutObjectInput{Bucket: &s.Bucket, Key: &key, Body: bytes.NewReader(data), ContentType: &kind})
	return err
}
func (s *S3Store) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := s.Client.GetObject(ctx, &s3.GetObjectInput{Bucket: &s.Bucket, Key: &key})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}
func (s *S3Store) Delete(ctx context.Context, key string) error {
	_, err := s.Client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: &s.Bucket, Key: &key})
	return err
}
